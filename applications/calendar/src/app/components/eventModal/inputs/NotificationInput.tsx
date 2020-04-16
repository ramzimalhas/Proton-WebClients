import React, { ChangeEvent } from 'react';
import { classnames, Select, TimeInput, IntegerInput } from 'react-components';
import { c, msgid } from 'ttag';
import { SETTINGS_NOTIFICATION_TYPE } from 'proton-shared/lib/interfaces/calendar';
import isTruthy from 'proton-shared/lib/helpers/isTruthy';

import { NOTIFICATION_UNITS, NOTIFICATION_UNITS_MAX, NOTIFICATION_WHEN } from '../../../constants';
import { NotificationModel } from '../../../interfaces/NotificationModel';

const { EMAIL, DEVICE } = SETTINGS_NOTIFICATION_TYPE;
const { DAY, MINUTES, HOURS, WEEK } = NOTIFICATION_UNITS;
const { BEFORE, AFTER } = NOTIFICATION_WHEN;

interface Props {
    className?: string;
    notification: NotificationModel;
    hasWhen?: boolean;
    hasType?: boolean;
    onChange: (model: NotificationModel) => void;
}

const NotificationInput = ({
    className,
    notification,
    notification: { isAllDay, type, when, value, at, unit },
    hasWhen = false,
    hasType = false,
    onChange
}: Props) => {
    const isAllDayBefore = isAllDay && when === BEFORE;

    const maxValue = NOTIFICATION_UNITS_MAX[unit];
    const numberValue = value !== undefined ? Math.min(value, maxValue) : undefined;
    const safeNumberValue = numberValue || 0;

    const notificationI18N = isAllDay
        ? {
              [BEFORE]: c('Event trigger').t`Before at`,
              [AFTER]: c('Event trigger').t`After at`
          }
        : {
              [BEFORE]: c('Event trigger').t`Before`,
              [AFTER]: c('Event trigger').t`After`
          };

    return (
        <div
            className={classnames([
                'flex flex-nowrap flex-items-center flex-item-fluid',
                className,
                isAllDay && 'onmobile-flex-column'
            ])}
        >
            <span className={classnames(['flex flex-nowrap flex-items-center', isAllDay && 'onmobile-mb0-5'])}>
                {hasType ? (
                    <Select
                        className="mr1"
                        value={type}
                        options={[
                            { text: c('Notification type').t`Notification`, value: DEVICE },
                            { text: c('Notification type').t`Email`, value: EMAIL }
                        ]}
                        onChange={({ target }: ChangeEvent<HTMLSelectElement>) =>
                            onChange({ ...notification, type: +target.value })
                        }
                    />
                ) : null}
                <IntegerInput
                    data-test-id="notification-time-input"
                    className="mr1"
                    step={1}
                    min={0}
                    max={maxValue}
                    value={numberValue}
                    onChange={(newValue) => {
                        if (isAllDayBefore && unit === NOTIFICATION_UNITS.DAY) {
                            if (newValue && newValue <= 0) {
                                onChange({ ...notification, value: 1 });
                                return;
                            }
                        }
                        onChange({ ...notification, value: newValue });
                    }}
                    onBlur={() => {
                        if (!value) {
                            onChange({ ...notification, value: 0 });
                        }
                    }}
                />
                <Select
                    data-test-id="notification-time-dropdown"
                    className={classnames(['mr1', isAllDay && 'onmobile-mr0'])}
                    value={unit}
                    options={[
                        !isAllDay && {
                            text: c('Time unit').ngettext(msgid`Minute`, `Minutes`, safeNumberValue),
                            value: MINUTES
                        },
                        !isAllDay && {
                            text: c('Time unit').ngettext(msgid`Hour`, `Hours`, safeNumberValue),
                            value: HOURS
                        },
                        { text: c('Time unit').ngettext(msgid`Day`, `Days`, safeNumberValue), value: DAY },
                        { text: c('Time unit').ngettext(msgid`Week`, `Weeks`, safeNumberValue), value: WEEK }
                    ].filter(isTruthy)}
                    onChange={({ target }: ChangeEvent<HTMLSelectElement>) => {
                        const newUnit = +target.value as NOTIFICATION_UNITS;
                        if (isAllDay && newUnit === DAY && value === 0 && when === BEFORE) {
                            onChange({ ...notification, value: 1, unit: newUnit });
                            return;
                        }
                        const normalizedValue = Math.min(notification.value || 0, NOTIFICATION_UNITS_MAX[newUnit]);
                        onChange({ ...notification, value: normalizedValue, unit: newUnit });
                    }}
                />
            </span>
            <span data-test-id="notification-time-before-at" className="flex flex-nowrap flex-items-center">
                {hasWhen ? (
                    <Select
                        className="mr1 flex-item-noshrink pr0-5"
                        value={when}
                        options={[
                            { text: notificationI18N[BEFORE], value: NOTIFICATION_WHEN.BEFORE },
                            { text: notificationI18N[AFTER], value: NOTIFICATION_WHEN.AFTER }
                        ]}
                        onChange={({ target }: ChangeEvent<HTMLSelectElement>) => {
                            const when = target.value as NOTIFICATION_WHEN;
                            onChange({ ...notification, when });
                        }}
                    />
                ) : (
                    <span className="flex-item-noshrink pr0-5">{notificationI18N[when].toLowerCase()}</span>
                )}
                {isAllDay && at ? <TimeInput value={at} onChange={(at) => onChange({ ...notification, at })} /> : null}
            </span>
        </div>
    );
};

export default NotificationInput;
