import { render } from '@testing-library/react';

import { PAYMENT_METHOD_TYPES } from '@proton/shared/lib/constants';
import { CardDetails, PayPalDetails, PaymentMethod } from '@proton/shared/lib/interfaces';

import TableBody from '../../components/table/TableBody';
import TableRow from '../../components/table/TableRow';
import PaymentMethodsTable from './PaymentMethodsTable';

jest.mock('../../components/table/TableRow', () => jest.fn());
jest.mock('../../components/table/TableBody');
jest.mock('./PaymentMethodActions', () => jest.fn().mockReturnValue(null));

describe('PaymentMethodsTable', () => {
    it('should render message that user has no payment methods', () => {
        const { container } = render(<PaymentMethodsTable loading={false} methods={[]} />);

        expect(container).toHaveTextContent('You have no saved payment methods.');
    });

    it('should render <TableBody> with loading flag', () => {
        const TableBodyMock: jest.Mock = TableBody as any;
        TableBodyMock.mockReset();
        TableBodyMock.mockReturnValue(<span>Table Body</span>);

        const { container } = render(<PaymentMethodsTable loading={true} methods={[]} />);

        expect(TableBodyMock).toHaveBeenCalled();
        expect(TableBodyMock.mock.calls[0][0].loading).toEqual(true);
        expect(container).not.toHaveTextContent('You have no saved payment methods.');
        expect(container).toHaveTextContent('Table Body');
    });

    it('should render Card method', () => {
        const Details: CardDetails = {
            Name: 'John Smith',
            ExpMonth: '01',
            ExpYear: '2034',
            ZIP: '12345',
            Country: 'US',
            Last4: '1234',
            Brand: 'Visa',
        };

        const cardPaymentMethod: PaymentMethod = {
            Type: PAYMENT_METHOD_TYPES.CARD,
            Details,
            Order: 1,
            ID: 'id123',
        };

        const TableBodyMock: jest.Mock = TableBody as any;
        TableBodyMock.mockReset();
        TableBodyMock.mockImplementation(({ children }) => children);

        const TableRowMock: jest.Mock = TableRow as any;
        TableRowMock.mockReset();
        TableRowMock.mockImplementation(({ cells }) => (
            <>
                <span>Table Row</span>
                <div>{cells}</div>
            </>
        ));

        const { container } = render(<PaymentMethodsTable methods={[cardPaymentMethod]} loading={false} />);

        expect(container).toHaveTextContent(Details.Brand);
        expect(container).toHaveTextContent(Details.Last4);
    });

    it('should render Paypal method', () => {
        const Details: PayPalDetails & { Payer: string } = {
            BillingAgreementID: 'agreement-id-123',
            PayerID: 'payer-id-123',
            Payer: 'John Smith',
        };

        const paypalMethod: PaymentMethod = {
            Type: PAYMENT_METHOD_TYPES.PAYPAL,
            Details,
            Order: 1,
            ID: 'id123',
        };

        const TableBodyMock: jest.Mock = TableBody as any;
        TableBodyMock.mockReset();
        TableBodyMock.mockImplementation(({ children }) => children);

        const TableRowMock: jest.Mock = TableRow as any;
        TableRowMock.mockReset();
        TableRowMock.mockImplementation(({ cells }) => (
            <>
                <span>Table Row</span>
                <div>{cells}</div>
            </>
        ));

        const { container } = render(<PaymentMethodsTable methods={[paypalMethod]} loading={false} />);

        expect(container).toHaveTextContent('PayPal');
        expect(container).toHaveTextContent('John Smith');
    });

    it('should display multiple payment methods', () => {
        const Details1: CardDetails = {
            Name: 'John Smith',
            ExpMonth: '01',
            ExpYear: '2034',
            ZIP: '12345',
            Country: 'US',
            Last4: '1234',
            Brand: 'Visa',
        };

        const cardPaymentMethod1: PaymentMethod = {
            Type: PAYMENT_METHOD_TYPES.CARD,
            Details: Details1,
            Order: 1,
            ID: 'id-visa',
        };

        const Details2: CardDetails = {
            Name: 'John Smith',
            ExpMonth: '01',
            ExpYear: '2038',
            ZIP: '12345',
            Country: 'US',
            Last4: '4444',
            Brand: 'Mastercard',
        };

        const cardPaymentMethod2: PaymentMethod = {
            Type: PAYMENT_METHOD_TYPES.CARD,
            Details: Details2,
            Order: 2,
            ID: 'id-mastercard',
        };

        const paypalMethod: PaymentMethod = {
            Type: PAYMENT_METHOD_TYPES.PAYPAL,
            Details: {
                BillingAgreementID: 'agreement-id-123',
                PayerID: 'payer-id-123',
                Payer: 'John Smith PayPal',
            } as any,
            Order: 0,
            ID: 'id-paypal',
        };

        const TableBodyMock: jest.Mock = TableBody as any;
        TableBodyMock.mockReset();
        TableBodyMock.mockImplementation(({ children }) => children);

        const TableRowMock: jest.Mock = TableRow as any;
        TableRowMock.mockReset();
        TableRowMock.mockImplementation(({ cells }) => (
            <>
                <span>Table Row</span>
                <div>{cells}</div>
            </>
        ));

        const { container } = render(
            <PaymentMethodsTable methods={[cardPaymentMethod1, cardPaymentMethod2, paypalMethod]} loading={false} />
        );

        expect(container).toHaveTextContent('John Smith PayPal');
        expect(container).toHaveTextContent('Visa');
        expect(container).toHaveTextContent('Mastercard');

        // sorted by Order
        expect(TableBodyMock.mock.calls[0][0].children.map((it: any) => it.key)).toEqual([
            'id-paypal',
            'id-visa',
            'id-mastercard',
        ]);
    });
});
