import type { MutableRefObject } from 'react';

import noop from '@proton/utils/noop';

import { pullForkSession, pushForkSession, revoke } from '../api/auth';
import { OAuthForkResponse, postOAuthFork } from '../api/oauth';
import { getUser } from '../api/user';
import { getAppHref, getClientID } from '../apps/helper';
import { APPS, APP_NAMES, SSO_PATHS } from '../constants';
import { withAuthHeaders, withUIDHeaders } from '../fetch/headers';
import { replaceUrl } from '../helpers/browser';
import { encodeBase64URL, uint8ArrayToString } from '../helpers/encoding';
import { Api, User as tsUser } from '../interfaces';
import { Extension, FORK_TYPE } from './ForkInterface';
import { getKey } from './cryptoHelper';
import { InvalidForkConsumeError, InvalidPersistentSessionError } from './error';
import { PullForkResponse, PushForkResponse } from './interface';
import { persistSession, resumeSession } from './persistedSessionHelper';
import { getForkDecryptedBlob, getForkEncryptedBlob } from './sessionForkBlob';
import {
    getValidatedApp,
    getValidatedForkType,
    getValidatedLocalID,
    getValidatedRawKey,
} from './sessionForkValidation';

interface ExtensionForkPayload {
    selector: string;
    keyPassword: string | undefined;
    persistent: boolean;
    trusted: boolean;
    state: string;
}

export type ExtensionForkResultPayload = {
    title?: string;
    message: string;
};

export type ExtensionForkResult = {
    type: 'error' | 'success';
    payload?: ExtensionForkResultPayload;
};

export const produceExtensionFork = ({
    messageListenerRef,
    extension,
    payload,
}: {
    messageListenerRef: MutableRefObject<any>;
    extension: Extension;
    payload: ExtensionForkPayload;
}): Promise<ExtensionForkResult> => {
    return new Promise((resolve) => {
        window.setTimeout(() => {
            resolve({ type: 'error', payload: { message: 'Extension timed out' } });
        }, 15000);

        // Fallback for firefox browsers since it doesn't implement externally connectable
        const handleFallback = () => {
            window.removeEventListener('message', messageListenerRef.current);

            messageListenerRef.current = (event: MessageEvent<any>) => {
                if (event.source !== window) {
                    return;
                }
                if (event.data?.fork === 'success') {
                    window.removeEventListener('message', messageListenerRef.current);
                    messageListenerRef.current = undefined;

                    resolve({
                        type: 'success',
                        payload: event.data.payload,
                    });
                }
            };

            window.addEventListener('message', messageListenerRef.current);
            window.postMessage(
                {
                    extension: extension.ID,
                    type: 'fork',
                    payload,
                },
                '/'
            );
        };

        try {
            const browser = 'chrome' in window ? (window as any).chrome : undefined;
            if (!browser?.runtime?.sendMessage) {
                return handleFallback();
            }
            browser.runtime.sendMessage(
                extension.ID,
                {
                    type: 'fork',
                    payload,
                },
                (result: any) => {
                    if (browser.runtime.lastError) {
                        resolve({
                            type: 'error',
                            payload: browser.runtime.lastError.message,
                        });
                        return;
                    }
                    resolve(result);
                }
            );
        } catch (e) {
            handleFallback();
        }
    });
};

interface ForkState {
    url: string;
}

export const requestFork = (fromApp: APP_NAMES, localID?: number, type?: FORK_TYPE) => {
    const state = encodeBase64URL(uint8ArrayToString(crypto.getRandomValues(new Uint8Array(32))));

    const searchParams = new URLSearchParams();
    searchParams.append('app', fromApp);
    searchParams.append('state', state);
    if (localID !== undefined) {
        searchParams.append('u', `${localID}`);
    }
    if (type !== undefined) {
        searchParams.append('t', type);
    }

    const url = type === FORK_TYPE.SWITCH ? getAppHref('/', fromApp) : window.location.href;
    const forkStateData: ForkState = { url };
    sessionStorage.setItem(`f${state}`, JSON.stringify(forkStateData));

    return replaceUrl(getAppHref(`${SSO_PATHS.AUTHORIZE}?${searchParams.toString()}`, APPS.PROTONACCOUNT));
};

export interface OAuthProduceForkParameters {
    clientID: string;
    oaSession: string;
}

interface ProduceOAuthForkArguments extends OAuthProduceForkParameters {
    api: Api;
    UID: string;
}

export const produceOAuthFork = async ({ api, UID, oaSession, clientID }: ProduceOAuthForkArguments) => {
    const {
        Data: { RedirectUri },
    } = await api<{ Data: OAuthForkResponse }>(
        withUIDHeaders(
            UID,
            postOAuthFork({
                ClientID: clientID,
                OaSession: oaSession,
            })
        )
    );

    return replaceUrl(RedirectUri);
};

export interface ProduceForkParameters {
    state: string;
    app: APP_NAMES;
    type?: FORK_TYPE;
    plan?: string;
}

export interface ProduceForkParametersFull extends ProduceForkParameters {
    localID: number;
}

export const getProduceForkParameters = (): Partial<ProduceForkParametersFull> => {
    const searchParams = new URLSearchParams(window.location.search);
    const app = searchParams.get('app') || '';
    const state = searchParams.get('state') || '';
    const localID = searchParams.get('u') || '';
    const type = searchParams.get('t') || '';
    const plan = searchParams.get('plan') || '';

    return {
        state: state.slice(0, 100),
        localID: getValidatedLocalID(localID),
        app: getValidatedApp(app),
        type: getValidatedForkType(type),
        plan,
    };
};

interface ProduceForkArguments {
    api: Api;
    UID: string;
    keyPassword?: string;
    app: APP_NAMES;
    state: string;
    persistent: boolean;
    trusted: boolean;
    type?: FORK_TYPE;
}

export const produceFork = async ({
    api,
    UID,
    keyPassword,
    state,
    app,
    type,
    persistent,
    trusted,
}: ProduceForkArguments) => {
    const rawKey = crypto.getRandomValues(new Uint8Array(32));
    const base64StringKey = encodeBase64URL(uint8ArrayToString(rawKey));
    const payload = keyPassword ? await getForkEncryptedBlob(await getKey(rawKey), { keyPassword }) : undefined;
    const childClientID = getClientID(app);
    const { Selector } = await api<PushForkResponse>(
        withUIDHeaders(
            UID,
            pushForkSession({
                Payload: payload,
                ChildClientID: childClientID,
                Independent: 0,
            })
        )
    );

    const toConsumeParams = new URLSearchParams();
    toConsumeParams.append('selector', Selector);
    toConsumeParams.append('state', state);
    toConsumeParams.append('sk', base64StringKey);
    if (persistent) {
        toConsumeParams.append('p', '1');
    }
    if (trusted) {
        toConsumeParams.append('tr', '1');
    }
    if (type !== undefined) {
        toConsumeParams.append('t', type);
    }

    return replaceUrl(getAppHref(`${SSO_PATHS.FORK}#${toConsumeParams.toString()}`, app));
};

const getForkStateData = (data?: string | null): ForkState | undefined => {
    if (!data) {
        return undefined;
    }
    try {
        const { url } = JSON.parse(data);
        return {
            url,
        };
    } catch (e: any) {
        return undefined;
    }
};

export const getConsumeForkParameters = () => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const selector = hashParams.get('selector') || '';
    const state = hashParams.get('state') || '';
    const base64StringKey = hashParams.get('sk') || '';
    const type = hashParams.get('t') || '';
    const persistent = hashParams.get('p') || '';
    const trusted = hashParams.get('tr') || '';

    return {
        state: state.slice(0, 100),
        selector,
        key: base64StringKey.length ? getValidatedRawKey(base64StringKey) : undefined,
        type: getValidatedForkType(type),
        persistent: persistent === '1',
        trusted: trusted === '1',
    };
};

export const removeHashParameters = () => {
    window.location.hash = '';
};

interface ConsumeForkArguments {
    api: Api;
    selector: string;
    state: string;
    key: Uint8Array;
    persistent: boolean;
    trusted: boolean;
}

export const consumeFork = async ({ selector, api, state, key, persistent, trusted }: ConsumeForkArguments) => {
    const stateData = getForkStateData(sessionStorage.getItem(`f${state}`));
    if (!stateData) {
        throw new InvalidForkConsumeError(`Missing state ${state}`);
    }
    const { url: previousUrl } = stateData;
    if (!previousUrl) {
        throw new InvalidForkConsumeError('Missing url');
    }
    const url = new URL(previousUrl);
    const path = `${url.pathname}${url.search}${url.hash}`;

    const { UID, AccessToken, RefreshToken, Payload, LocalID } = await api<PullForkResponse>(pullForkSession(selector));
    const authApi = <T>(config: any) => api<T>(withAuthHeaders(UID, AccessToken, config));

    try {
        // Resume and use old session if it exists
        const validatedSession = await resumeSession(api, LocalID);

        // Revoke the discarded forked session
        await authApi(revoke({ Child: 1 })).catch(noop);

        return {
            ...validatedSession,
            path,
        } as const;
    } catch (e: any) {
        // If existing session is invalid. Fall through to continue using the new fork.
        if (!(e instanceof InvalidPersistentSessionError)) {
            throw e;
        }
    }

    let keyPassword: string | undefined;

    if (Payload) {
        try {
            const data = await getForkDecryptedBlob(await getKey(key), Payload);
            keyPassword = data?.keyPassword;
        } catch (e: any) {
            throw new InvalidForkConsumeError('Failed to decrypt payload');
        }
    }

    const User = await authApi<{ User: tsUser }>(getUser()).then(({ User }) => User);

    const result = {
        User,
        UID,
        LocalID,
        keyPassword,
        persistent,
        trusted,
        AccessToken,
        RefreshToken,
    };

    await persistSession({ api: authApi, ...result });

    return {
        ...result,
        path,
    } as const;
};
