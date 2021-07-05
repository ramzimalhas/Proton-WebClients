import React, { useState } from 'react';
import { c } from 'ttag';
import { sendFeedback } from '@proton/shared/lib/api/feedback';

import { FormModal, Scale, TextArea } from '../../components';
import { useApi, useLoading, useNotifications } from '../../hooks';

interface FeedbackModalModel {
    Score?: number;
    Feedback: string;
}

interface Props {
    onClose?: () => void;
    feedbackType: string;
    description: string;
    scaleTitle: string;
}

const FeedbackModal = ({ onClose, feedbackType, description, scaleTitle, ...rest }: Props) => {
    const api = useApi();
    const { createNotification } = useNotifications();
    const [loading, withLoading] = useLoading();
    const [model, setModel] = useState<FeedbackModalModel>({
        Score: undefined,
        Feedback: '',
    });

    const handleSubmit = async () => {
        if (model.Score === undefined) {
            createNotification({
                text: c('Error notification when score is missing in user feedback form modal').t`Score is required`,
                type: 'error',
            });
            return;
        }
        await api(
            sendFeedback({
                Score: model.Score,
                Feedback: model.Feedback,
                FeedbackType: feedbackType,
            })
        );
        createNotification({ text: c('Success notification when user send feedback').t`Feedback sent` });
        onClose?.();
    };

    const handleChange = (field: string) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setModel({
            ...model,
            [field]: e.target.value,
        });
    };

    const handleScoreChange = (Score: number) => {
        setModel({ ...model, Score });
    };

    return (
        <FormModal
            title={c('Title').t`Give feedback`}
            submit={c('Action').t`Submit`}
            onSubmit={() => withLoading(handleSubmit())}
            loading={loading}
            onClose={onClose}
            {...rest}
        >
            <p className="mb2">{description}</p>
            <div className="mb2">
                <label className="mb1 block" id="score-label">
                    {scaleTitle}
                </label>
                <div className="w75 on-mobile-w100">
                    <Scale
                        from={0}
                        to={10}
                        fromLabel={c('Label').t`0 - Not a fan`}
                        toLabel={c('Label').t`10 - Love it!`}
                        value={model.Score}
                        InputButtonProps={{ 'aria-describedby': 'score-label' }}
                        onChange={handleScoreChange}
                    />
                </div>
            </div>
            <div>
                <label className="mb1 block" htmlFor="feedback-label">{c('Label')
                    .t`Please provide any additional feedback. Thank you for helping us make Proton products better!`}</label>
                <TextArea
                    id="feedback-label"
                    value={model.Feedback}
                    placeholder={c('Placeholder').t`Feedback`}
                    onChange={handleChange('Feedback')}
                />
            </div>
        </FormModal>
    );
};

export default FeedbackModal;
