import { fireEvent, render, waitFor } from '@testing-library/react';

import { deletePaymentMethod, orderPaymentMethods } from '@proton/shared/lib/api/payments';
import { PAYMENT_METHOD_TYPES } from '@proton/shared/lib/constants';
import { PaymentMethod } from '@proton/shared/lib/interfaces';

import { useApi, useEventManager, useModals, useNotifications } from '../..';
import { DropdownActions } from '../../components';
import PaymentMethodActions from './PaymentMethodActions';

jest.mock('../../hooks/useNotifications', () =>
    jest.fn().mockReturnValue({
        createNotification: jest.fn(),
    })
);

jest.mock('../../hooks/useModals', () =>
    jest.fn().mockReturnValue({
        createModal: jest.fn(),
    })
);

jest.mock('../../hooks/useEventManager', () =>
    jest.fn().mockReturnValue({
        call: jest.fn(),
    })
);

jest.mock('../../hooks/useApi', () => jest.fn().mockReturnValue(jest.fn()));

jest.mock('../../components/dropdown/DropdownActions', () =>
    jest.fn().mockImplementation(({ list }) => list.map(({ text }: any) => <span>{text}</span>))
);

jest.mock('../payments/EditCardModal', () => jest.fn().mockImplementation(() => <span>Edit Card Modal</span>));
jest.mock('../../components/modal/Confirm', () =>
    jest.fn().mockImplementation(({ onConfirm }) => (
        <button onClick={onConfirm} data-testid="confirm-deletion">
            ConfirmModal
        </button>
    ))
);

describe('PaymentMethodActions', () => {
    it('should show only delete button if paypal is the first method', () => {
        const method: PaymentMethod = {
            Order: 1,
            ID: 'id-123',
            Type: PAYMENT_METHOD_TYPES.PAYPAL,
            Details: {
                BillingAgreementID: 'agreement-123',
                PayerID: 'payer-123',
                Payer: 'payer-123',
            },
        };

        const { container } = render(<PaymentMethodActions method={method} methods={[method]} index={0} />);

        expect(container).not.toHaveTextContent('Edit');
        expect(container).not.toHaveTextContent('Mark as default');
        expect(container).toHaveTextContent('Delete');
    });

    it('should show "delete" and "mark as default" button if paypal is not the first', () => {
        const method: PaymentMethod = {
            Order: 1,
            ID: 'id-123',
            Type: PAYMENT_METHOD_TYPES.PAYPAL,
            Details: {
                BillingAgreementID: 'agreement-123',
                PayerID: 'payer-123',
                Payer: 'payer-123',
            },
        };

        const { container } = render(<PaymentMethodActions method={method} methods={[method]} index={1} />);

        expect(container).not.toHaveTextContent('Edit');
        expect(container).toHaveTextContent('Mark as default');
        expect(container).toHaveTextContent('Delete');
    });

    it('should show Edit, Default and Delete buttons for non-first card', () => {
        const method: PaymentMethod = {
            Order: 1,
            ID: 'id-123',
            Type: PAYMENT_METHOD_TYPES.CARD,
            Details: {
                Name: 'John Smith',
                ExpMonth: '01',
                ExpYear: '2038',
                ZIP: '12345',
                Country: 'US',
                Last4: '4444',
                Brand: 'Mastercard',
            },
        };

        const { container } = render(<PaymentMethodActions method={method} methods={[method]} index={1} />);

        expect(container).toHaveTextContent('Edit');
        expect(container).toHaveTextContent('Mark as default');
        expect(container).toHaveTextContent('Delete');
    });

    it('should show Edit and Delete buttons for first card', () => {
        const method: PaymentMethod = {
            Order: 1,
            ID: 'id-123',
            Type: PAYMENT_METHOD_TYPES.CARD,
            Details: {
                Name: 'John Smith',
                ExpMonth: '01',
                ExpYear: '2038',
                ZIP: '12345',
                Country: 'US',
                Last4: '4444',
                Brand: 'Mastercard',
            },
        };

        const { container } = render(<PaymentMethodActions method={method} methods={[method]} index={0} />);

        expect(container).toHaveTextContent('Edit');
        expect(container).not.toHaveTextContent('Mark as default');
        expect(container).toHaveTextContent('Delete');
    });

    describe('action handlers', () => {
        beforeEach(() => {
            const DropdownActionsMock: jest.Mock = DropdownActions as any;
            DropdownActionsMock.mockReset().mockImplementation(({ list }: { list: any[] }) =>
                list.map(({ text, onClick }, actionIndex) => (
                    <button onClick={onClick} data-testid={`actionIndex-${actionIndex}`}>
                        {text}
                    </button>
                ))
            );
        });

        it('should open EditCardModal on Edit', async () => {
            const method: PaymentMethod = {
                Order: 1,
                ID: 'id-123',
                Type: PAYMENT_METHOD_TYPES.CARD,
                Details: {
                    Name: 'John Smith',
                    ExpMonth: '01',
                    ExpYear: '2038',
                    ZIP: '12345',
                    Country: 'US',
                    Last4: '4444',
                    Brand: 'Mastercard',
                },
            };
            const { createModal } = useModals();
            (createModal as jest.Mock).mockReset();

            const { findByTestId } = render(<PaymentMethodActions method={method} methods={[method]} index={1} />);

            fireEvent.click(await findByTestId('actionIndex-0'));

            expect(createModal).toHaveBeenCalled();
        });

        it('should make an API call on Mark as Default', async () => {
            const method0: PaymentMethod = {
                Order: 0,
                ID: 'id-000',
                Type: PAYMENT_METHOD_TYPES.CARD,
                Details: {
                    Name: 'John Smith',
                    ExpMonth: '01',
                    ExpYear: '2055',
                    ZIP: '12345',
                    Country: 'US',
                    Last4: '4242',
                    Brand: 'Visa',
                },
            };

            const method1: PaymentMethod = {
                Order: 1,
                ID: 'id-123',
                Type: PAYMENT_METHOD_TYPES.CARD,
                Details: {
                    Name: 'John Smith',
                    ExpMonth: '01',
                    ExpYear: '2038',
                    ZIP: '12345',
                    Country: 'US',
                    Last4: '4444',
                    Brand: 'Mastercard',
                },
            };

            const api = useApi();
            (api as jest.Mock).mockReset();

            const { call } = useEventManager();
            (call as jest.Mock).mockReset();

            const { createNotification } = useNotifications();
            (createNotification as jest.Mock).mockReset();

            const { findByTestId } = render(
                <PaymentMethodActions method={method1} methods={[method0, method1]} index={1} />
            );

            await waitFor(async () => {
                fireEvent.click(await findByTestId('actionIndex-1'));
            });

            expect(api).toHaveBeenCalledWith(orderPaymentMethods(['id-123', 'id-000'])); // a request to change the order of the payment methods
            expect(call).toHaveBeenCalled();
            expect(createNotification).toHaveBeenCalled();
        });

        it('should open ConfirmModal on Delete', async () => {
            const method: PaymentMethod = {
                Order: 1,
                ID: 'id-123',
                Type: PAYMENT_METHOD_TYPES.CARD,
                Details: {
                    Name: 'John Smith',
                    ExpMonth: '01',
                    ExpYear: '2038',
                    ZIP: '12345',
                    Country: 'US',
                    Last4: '4444',
                    Brand: 'Mastercard',
                },
            };
            const { createModal } = useModals();
            (createModal as jest.Mock).mockReset();

            const api = useApi();
            (api as jest.Mock).mockReset();

            const { call } = useEventManager();
            (call as jest.Mock).mockReset();

            const { createNotification } = useNotifications();
            (createNotification as jest.Mock).mockReset();

            const { findByTestId } = render(<PaymentMethodActions method={method} methods={[method]} index={1} />);

            fireEvent.click(await findByTestId('actionIndex-2'));

            expect(createModal).toHaveBeenCalled();

            await waitFor(async () => {
                const onDelete = (createModal as jest.Mock).mock.lastCall[0].props.onConfirm;
                await onDelete();
            });

            expect(api).toHaveBeenCalledWith(deletePaymentMethod('id-123'));
            expect(call).toHaveBeenCalled();
            expect(createNotification).toHaveBeenCalled();
        });
    });
});
