import { c, msgid } from 'ttag';

import { Href } from '@proton/atoms';
import { useNotifications } from '@proton/components';
import { MAIL_APP_NAME } from '@proton/shared/lib/constants';
import { setBit } from '@proton/shared/lib/helpers/bitset';
import { getKnowledgeBaseUrl } from '@proton/shared/lib/helpers/url';
import { MESSAGE_FLAGS } from '@proton/shared/lib/mail/constants';

import { DEFAULT_EO_EXPIRATION_DAYS } from '../../../constants';
import { useExternalExpiration } from '../../../hooks/composer/useExternalExpiration';
import { updateExpires } from '../../../logic/messages/draft/messagesDraftActions';
import { MessageState } from '../../../logic/messages/messagesTypes';
import { useAppDispatch } from '../../../logic/store';
import { MessageChange } from '../Composer';
import ComposerInnerModal from './ComposerInnerModal';
import PasswordInnerModalForm from './PasswordInnerModalForm';

const getNumberOfExpirationDays = (message?: MessageState) => {
    const expirationInSeconds = message?.draftFlags?.expiresIn || 0;
    const numberOfDaysAlreadySet = Math.floor(expirationInSeconds / 86400);

    return message?.draftFlags?.expiresIn ? numberOfDaysAlreadySet : 28;
};

const getExpirationText = (message?: MessageState) => {
    const numberOfDays = getNumberOfExpirationDays(message);

    if (numberOfDays === 0) {
        return c('Info').t`Your message will expire today.`;
    }
    if (numberOfDays === 1) {
        return c('Info').t`Your message will expire tomorrow.`;
    }
    return c('Info').ngettext(
        msgid`Your message will expire in ${numberOfDays} day.`,
        `Your message will expire in ${numberOfDays} days.`,
        numberOfDays
    );
};

interface Props {
    message?: MessageState;
    onClose: () => void;
    onChange: MessageChange;
}

const ComposerPasswordModal = ({ message, onClose, onChange }: Props) => {
    const {
        password,
        setPassword,
        passwordHint,
        setPasswordHint,
        isPasswordSet,
        setIsPasswordSet,
        validator,
        onFormSubmit,
    } = useExternalExpiration(message);
    const { createNotification } = useNotifications();
    const dispatch = useAppDispatch();

    const isEdition = message?.draftFlags?.expiresIn;

    const handleSubmit = () => {
        onFormSubmit();

        if (!isPasswordSet) {
            return;
        }

        if (!isEdition) {
            const valueInHours = DEFAULT_EO_EXPIRATION_DAYS * 24;

            onChange(
                (message) => ({
                    data: {
                        Flags: setBit(message.data?.Flags, MESSAGE_FLAGS.FLAG_INTERNAL),
                        Password: password,
                        PasswordHint: passwordHint,
                    },
                    draftFlags: { expiresIn: valueInHours * 3600 },
                }),
                true
            );
            dispatch(updateExpires({ ID: message?.localID || '', expiresIn: valueInHours * 3600 }));
        } else {
            onChange(
                (message) => ({
                    data: {
                        Flags: setBit(message.data?.Flags, MESSAGE_FLAGS.FLAG_INTERNAL),
                        Password: password,
                        PasswordHint: passwordHint,
                    },
                }),
                true
            );
        }

        createNotification({ text: c('Notification').t`Password has been set successfully` });

        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    // translator : The variable "MAIL_APP_NAME" is the text "Proton Mail". This string is the bold part of the larger string "Send an encrypted, password protected message to a ${boldText} email address."
    const boldText = <strong key="strong-text">{c('Info').t`non-${MAIL_APP_NAME}`}</strong>;

    // translator : The variable "boldText" is the text "non-Proton Mail" written in bold
    const encryptionText = c('Info').jt`Send an encrypted, password protected message to a ${boldText} email address.`;

    const expirationText = getExpirationText(message);

    return (
        <ComposerInnerModal
            title={isEdition ? c('Info').t`Edit encryption` : c('Info').t`Encrypt message`}
            submit={c('Action').t`Set encryption`}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
        >
            <p className="mt0 mb0-5 color-weak">{encryptionText}</p>
            <p className="mt0 mb1 color-weak">
                {expirationText}
                <br />
                <Href href={getKnowledgeBaseUrl('/password-protected-emails')}>{c('Info').t`Learn more`}</Href>
            </p>

            <PasswordInnerModalForm
                password={password}
                setPassword={setPassword}
                passwordHint={passwordHint}
                setPasswordHint={setPasswordHint}
                isPasswordSet={isPasswordSet}
                setIsPasswordSet={setIsPasswordSet}
                validator={validator}
            />
        </ComposerInnerModal>
    );
};

export default ComposerPasswordModal;
