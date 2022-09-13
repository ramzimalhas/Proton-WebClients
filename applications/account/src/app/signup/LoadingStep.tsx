import { useEffect, useState } from 'react';

import { c } from 'ttag';

import { CircleLoader, Icon, ProtonLogo, classnames } from '@proton/components';
import useInterval from '@proton/hooks/useInterval';
import isTruthy from '@proton/utils/isTruthy';
import noop from '@proton/utils/noop';

import Content from '../public/Content';
import Main from '../public/Main';

interface Props {
    onSetup: () => Promise<void>;
    hasPayment?: boolean;
}

const LoadingStep = ({ onSetup, hasPayment }: Props) => {
    const steps: string[] = [
        c('Info').t`Creating your account`,
        c('Info').t`Securing your account`,
        hasPayment && c('Info').t`Verifying your payment`,
    ].filter(isTruthy);

    const [stepIndex, setStepIndex] = useState(0);

    useEffect(() => {
        onSetup().catch(noop);
    }, []);

    useInterval(() => {
        const nextIndex = stepIndex + 1;
        setStepIndex(nextIndex);
    }, 2500);

    return (
        <Main>
            <Content>
                <div className="text-center on-mobile-pt2">
                    <ProtonLogo size={60} variant="glyph-only" />
                    <hr className="mb2 mt2" />
                    <div className="inline-block">
                        {steps.map((step, i) => {
                            const isPreviousStep = i < stepIndex;
                            const isCurrentStep = i === stepIndex;

                            const isVisibleStep = isPreviousStep || isCurrentStep;
                            if (!isVisibleStep) {
                                return null;
                            }

                            return (
                                <div className="text-lg" key={step}>
                                    <div
                                        className={classnames([
                                            'flex-no-min-children flex-align-items-center flex-nowrap',
                                            isCurrentStep && 'color-primary',
                                        ])}
                                    >
                                        <div className="mr0-5 min-w2e flex flex-item-noshrink">
                                            {isCurrentStep ? (
                                                <CircleLoader size="small" className="ml0-25" />
                                            ) : (
                                                <Icon size={24} className="color-success" name="checkmark" />
                                            )}
                                        </div>
                                        <div className="flex-item-fluid p0-5 on-tiny-mobile-text-left">{step}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Content>
        </Main>
    );
};

export default LoadingStep;
