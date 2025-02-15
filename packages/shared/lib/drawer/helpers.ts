import { Feature } from '@proton/components/containers';
import { isURLProtonInternal } from '@proton/components/helpers/url';

import { getAppHref } from '../apps/helper';
import { getLocalIDFromPathname } from '../authentication/pathnameHelper';
import { APPS, APPS_CONFIGURATION, APP_NAMES } from '../constants';
import { DrawerFeatureFlag } from '../interfaces/Drawer';
import window from '../window';
import { DRAWER_ACTION, DRAWER_APPS, DRAWER_EVENTS } from './interfaces';

const { PROTONMAIL, PROTONCALENDAR, PROTONDRIVE } = APPS;

export const drawerAuthorizedApps = [
    APPS_CONFIGURATION[PROTONMAIL].subdomain,
    APPS_CONFIGURATION[PROTONCALENDAR].subdomain,
    APPS_CONFIGURATION[PROTONDRIVE].subdomain,
] as string[];

export const authorizedApps: string[] = [APPS.PROTONMAIL, APPS.PROTONCALENDAR, APPS.PROTONDRIVE];

export const drawerNativeApps: APP_NAMES[] = [APPS.PROTONCONTACTS];
export const drawerIframeApps: APP_NAMES[] = [APPS.PROTONCALENDAR];

export const getIsNativeDrawerApp = (app: APP_NAMES): app is DRAWER_APPS => {
    return drawerNativeApps.includes(app);
};

export const getIsIframedDrawerApp = (app: APP_NAMES): app is DRAWER_APPS => {
    return drawerIframeApps.includes(app);
};

export const getIsDrawerApp = (app: APP_NAMES): app is DRAWER_APPS => {
    return getIsNativeDrawerApp(app) || getIsIframedDrawerApp(app);
};

export const isAuthorizedDrawerUrl = (url: string) => {
    try {
        const originURL = new URL(url);

        // Get subdomain of the url => e.g. mail, calendar, drive
        const appFromUrl = originURL.hostname.split('.')[0];

        return isURLProtonInternal(url) && drawerAuthorizedApps.includes(appFromUrl);
    } catch {
        // the URL constructor will throw if no URL can be built out of url
        return false;
    }
};

export const getIsAuthorizedApp = (appName: string): appName is APP_NAMES => {
    return authorizedApps.includes(appName);
};

export const getIsDrawerPostMessage = (event: MessageEvent): event is MessageEvent<DRAWER_ACTION> => {
    const origin = event.origin;

    // sandboxed iframes might have a "null" origin instead of a valid one
    // so we need to handle this case, otherwise we will get an error
    if (!origin || origin === 'null') {
        return false;
    }

    /**
     * The message is a "valid" side app message if
     * - The message is coming from an authorized app
     * - event.data is defined
     * - event.data.type is part of the SIDE_APP_EVENT enum
     */
    return isAuthorizedDrawerUrl(origin) && event.data && Object.values(DRAWER_EVENTS).includes(event.data.type);
};

export const postMessageFromIframe = (message: DRAWER_ACTION, parentApp: APP_NAMES) => {
    if (!getIsAuthorizedApp(parentApp)) {
        return;
    }
    const parentUrl = getAppHref('/', parentApp, getLocalIDFromPathname(window.location.pathname));

    window.parent?.postMessage(message, parentUrl);
};

export const postMessageToIframe = (message: DRAWER_ACTION, iframedApp: APP_NAMES) => {
    if (!getIsAuthorizedApp(iframedApp)) {
        return;
    }
    const iframe = document.querySelector('[id^=drawer-app-iframe]') as HTMLIFrameElement | null;
    const targetOrigin = getAppHref('/', iframedApp, getLocalIDFromPathname(window.location.pathname));

    iframe?.contentWindow?.postMessage(message, targetOrigin);
};

/**
 *  Allow to add the parent app in a URL we will open in the Drawer
 *  From the child application, we need to know who is the parent. For that, we add it in the URL we want to open
 *  Depending on the case you might want to replace path or not
 *
 *  - "replacePath === true": You want to replace the path by the app
 *      e.g. url = "https://calendar.proton.pink/u/0/event?Action=VIEW&EventID=eventID&RecurrenceID=1670835600" and currentApp = "proton-mail"
 *        ==> https://calendar.proton.pink/u/0/mail?Action=VIEW&EventID=eventID&RecurrenceID=1670835600
 *        "event" has been replaced by "mail"
 *  - "replacePath === false": You want to add your app to the path
 *      e.g. url = "https://calendar.proton.pink/u/0/something" and currentApp = "proton-mail"
 *        ==> "https://calendar.proton.pink/u/0/mail/something"
 *        "mail" has been added to the path
 */
export const addParentAppToUrl = (url: string, currentApp: APP_NAMES, replacePath = true) => {
    const targetUrl = new URL(url);
    const splitPathname = targetUrl.pathname.split('/').filter((el) => el !== '');

    const currentAppSubdomain = APPS_CONFIGURATION[currentApp].subdomain;

    // splitPathname[0] & splitPathname[1] corresponds to the user local id /u/localID
    // splitPathname[2] should be the parentApp name
    // If we find parentApp, we don't need to add it to the pathname
    if (splitPathname[2] !== currentAppSubdomain) {
        // In some cases, we want to replace completely this param (e.g. Calendar "view" parameter needs to be mail instead of week)
        if (replacePath) {
            splitPathname.splice(2, 1, currentAppSubdomain);
        } else {
            splitPathname.splice(2, 0, currentAppSubdomain);
        }

        targetUrl.pathname = splitPathname.join('/');
    }

    return targetUrl.href;
};

export const getDisplayContactsInDrawer = (app: APP_NAMES, drawerFeature?: Feature<DrawerFeatureFlag>) => {
    if (app === APPS.PROTONMAIL) {
        return drawerFeature?.Value.ContactsInMail;
    } else if (app === APPS.PROTONCALENDAR) {
        return drawerFeature?.Value.ContactsInCalendar;
    } else if (app === APPS.PROTONDRIVE) {
        return drawerFeature?.Value.ContactsInDrive;
    }

    return undefined;
};

export const closeDrawerFromChildApp = (parentApp: APP_NAMES, currentApp: APP_NAMES, closeDefinitely?: boolean) => {
    if (!getIsIframedDrawerApp(currentApp)) {
        throw new Error('Cannot close non-iframed app');
    }

    postMessageFromIframe(
        {
            type: DRAWER_EVENTS.CLOSE,
            payload: { app: currentApp, closeDefinitely },
        },
        parentApp
    );
};

export const isAppInView = (currentApp: DRAWER_APPS, appInView?: DRAWER_APPS) => {
    return appInView ? appInView === currentApp : false;
};
