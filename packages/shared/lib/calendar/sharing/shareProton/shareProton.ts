import { c } from 'ttag';

import { serverTime } from '@proton/crypto';

import { acceptInvitation, rejectInvitation } from '../../../api/calendars';
import { SECOND } from '../../../constants';
import { getContactDisplayNameEmail } from '../../../contacts/contactEmail';
import { canonicalizeEmail } from '../../../helpers/email';
import { Api, SimpleMap } from '../../../interfaces';
import { CalendarMemberInvitation, MEMBER_INVITATION_STATUS, VisualCalendar } from '../../../interfaces/calendar';
import { ContactEmail } from '../../../interfaces/contacts';
import { GetAddressKeys } from '../../../interfaces/hooks/GetAddressKeys';
import { getPrimaryKey } from '../../../keys';
import { getIsOwnedCalendar, getIsSubscribedCalendar } from '../../calendar';
import { CALENDAR_PERMISSIONS } from '../../constants';
import { decryptPassphrase, signPassphrase } from '../../crypto/keys/calendarKeys';
import { getCanWrite } from '../../permissions';

export const getIsInvitationExpired = ({ ExpirationTime }: CalendarMemberInvitation) => {
    if (!ExpirationTime) {
        return false;
    }
    return +serverTime() >= ExpirationTime * SECOND;
};

export const getPendingInvitations = (invitations: CalendarMemberInvitation[]) => {
    return invitations.filter(({ Status }) => Status === MEMBER_INVITATION_STATUS.PENDING);
};

export const filterOutAcceptedInvitations = (invitations: CalendarMemberInvitation[]) => {
    return invitations.filter(({ Status }) => Status !== MEMBER_INVITATION_STATUS.ACCEPTED);
};

export const filterOutDeclinedInvitations = (invitations: CalendarMemberInvitation[]) => {
    return invitations.filter(({ Status }) => Status !== MEMBER_INVITATION_STATUS.REJECTED);
};

export const filterOutExpiredInvitations = (invitations: CalendarMemberInvitation[]) => {
    return invitations.filter((invitation) => !getIsInvitationExpired(invitation));
};

export const acceptCalendarShareInvitation = async ({
    addressID,
    calendarID,
    getAddressKeys,
    armoredPassphrase,
    api,
}: {
    addressID: string;
    calendarID: string;
    armoredPassphrase: string;
    getAddressKeys: GetAddressKeys;
    api: Api;
}) => {
    // TODO: signature verification?
    const addressKeys = await getAddressKeys(addressID);
    const privateKeys = addressKeys.map(({ privateKey }) => privateKey);
    const passphrase = await decryptPassphrase({
        armoredPassphrase,
        privateKeys,
    });
    const { privateKey } = getPrimaryKey(addressKeys) || {};
    if (!privateKey) {
        throw new Error('No primary address key');
    }
    const Signature = await signPassphrase({ passphrase, privateKey });
    return api(acceptInvitation(calendarID, addressID, { Signature }));
};

export const rejectCalendarShareInvitation = ({
    addressID,
    calendarID,
    api,
}: {
    addressID: string;
    calendarID: string;
    api: Api;
}) => {
    return api(rejectInvitation(calendarID, addressID));
};

export const getCalendarCreatedByText = (calendar: VisualCalendar, contactEmailsMap: SimpleMap<ContactEmail>) => {
    // we only need to display the owner for shared calendars
    if (getIsSubscribedCalendar(calendar) || getIsOwnedCalendar(calendar)) {
        return;
    }
    const { Name: contactName, Email: contactEmail } = contactEmailsMap[canonicalizeEmail(calendar.Owner.Email)] || {};
    const email = contactEmail || calendar.Owner.Email;
    const { nameEmail: ownerName } = getContactDisplayNameEmail({
        name: contactName,
        email,
        emailDelimiters: ['(', ')'],
    });

    return c('Shared calendar; Info about calendar owner').t`Created by ${ownerName}`;
};

export const getCalendarNameWithOwner = ({
    calendarName,
    ownerEmail,
}: {
    calendarName: string;
    ownerEmail: string;
}) => {
    return `${calendarName} (${ownerEmail})`;
};

export const getCalendarNameSubline = ({
    displayEmail,
    memberEmail,
    memberPermissions,
}: {
    displayEmail: boolean;
    memberEmail: string;
    memberPermissions: CALENDAR_PERMISSIONS;
}) => {
    const email = displayEmail ? memberEmail : '';
    const viewOnlyText = !getCanWrite(memberPermissions)
        ? c('Info; access rights for shared calendar').t`View only`
        : '';

    if (!email && !viewOnlyText) {
        return '';
    }

    if (!viewOnlyText) {
        return email;
    }

    if (!email) {
        return viewOnlyText;
    }

    return `${viewOnlyText} • ${email}`;
};
