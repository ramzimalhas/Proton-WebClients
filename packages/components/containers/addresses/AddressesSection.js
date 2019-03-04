import React, { useState, useContext } from 'react';
import { c } from 'ttag';
import PropTypes from 'prop-types';
import { SubTitle, Table, TableHeader, TableRow, TableBody, useLoading } from 'react-components';
import { connect } from 'react-redux';
import { queryAddresses } from 'proton-shared/lib/api/members';
import ContextApi from 'proton-shared/lib/context/api';

import AddressActions from './AddressActions';
import AddressStatus from './AddressStatus';
import AddressesToolbar from './AddressesToolbar';

const AddressesSection = ({ addresses }) => {
    const { api } = useContext(ContextApi);
    const [selectedAddresses, setAddresses] = useState(addresses.data);
    const { loading, loaded, load } = useLoading(addresses.loading);

    const handleChangeMember = async (memberID, self) => {
        if (self) {
            return setAddresses(addresses.data);
        }

        try {
            load();
            const { Addresses } = await api(queryAddresses(memberID));
            setAddresses(Addresses);
            loaded();
        } catch (error) {
            loaded();
            throw error;
        }
    };

    return (
        <>
            <SubTitle>{c('Title').t`Addresses`}</SubTitle>
            <AddressesToolbar onChangeMember={handleChangeMember} loading={loading} />
            <Table>
                <TableHeader
                    cells={[
                        c('Header for addresses table').t`Address`,
                        c('Header for addresses table').t`Status`,
                        c('Header for addresses table').t`Actions`
                    ]}
                />
                <TableBody loading={loading}>
                    {selectedAddresses.map((address, index) => {
                        const key = address.ID;
                        return (
                            <TableRow
                                key={key}
                                cells={[
                                    address.Email,
                                    <AddressStatus key={key} address={address} index={index} />,
                                    <AddressActions key={key} address={address} index={index} />
                                ]}
                            />
                        );
                    })}
                </TableBody>
            </Table>
        </>
    );
};

AddressesSection.propTypes = {
    addresses: PropTypes.object
};

const mapStateToProps = ({ addresses }) => ({ addresses });

export default connect(mapStateToProps)(AddressesSection);
