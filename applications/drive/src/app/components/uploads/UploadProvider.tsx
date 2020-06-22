import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { initUpload, UploadCallbacks, UploadControls } from './upload';
import { TransferState, TransferProgresses, TransferMeta, Upload, UploadInfo } from '../../interfaces/transfer';
import { isTransferProgress, isTransferPending } from '../../utils/transfer';

interface UploadProviderState {
    uploads: Upload[];
    addToUploadQueue: (
        file: File,
        metadataPromise: Promise<{ meta: TransferMeta; info: UploadInfo }>,
        callbacks: UploadCallbacks
    ) => Promise<void>;
    getUploadsProgresses: () => TransferProgresses;
    getUploadsImmediate: () => Upload[];
    clearUploads: () => void;
    removeUpload: (id: string) => void;
}

const MAX_ACTIVE_UPLOADS = 3;

const UploadContext = createContext<UploadProviderState | null>(null);

interface UserProviderProps {
    children: React.ReactNode;
}

export const UploadProvider = ({ children }: UserProviderProps) => {
    // Keeping ref in case we need to immediatelly get uploads without waiting for rerender
    const uploadsRef = useRef<Upload[]>([]);
    const [uploads, setUploads] = useState<Upload[]>([]);
    const controls = useRef<{ [id: string]: UploadControls }>({});
    const progresses = useRef<TransferProgresses>({});

    const updateUploadByID = (id: string, data: Partial<Upload>) => {
        uploadsRef.current = uploadsRef.current.map((upload) => (upload.id === id ? { ...upload, ...data } : upload));
        setUploads(uploadsRef.current);
    };

    const removeUpload = (id: string) => {
        uploadsRef.current = uploadsRef.current.filter((upload) => upload.id !== id);
        setUploads(uploadsRef.current);
    };

    const addNewUpload = (id: string, file: File) => {
        uploadsRef.current = [
            ...uploadsRef.current,
            {
                id,
                meta: {
                    filename: file.name,
                    mimeType: file.type,
                    size: file.size
                },
                state: TransferState.Initializing,
                startDate: new Date()
            }
        ];
        setUploads(uploadsRef.current);
    };

    const clearUploads = () => {
        // TODO: cancel pending uploads when implementing reject
        uploadsRef.current = [];
        setUploads(uploadsRef.current);
    };

    const updateUploadState = (id: string, state: TransferState, { error }: { error?: Error } = {}) =>
        updateUploadByID(id, { state, error });

    useEffect(() => {
        const uploading = uploads.filter(isTransferProgress);
        const nextPending = uploads.find(isTransferPending);

        if (uploading.length < MAX_ACTIVE_UPLOADS && nextPending) {
            const { id, info } = nextPending;

            if (!info) {
                // Should never happen really
                console.error('Pending upload has no upload info');
                updateUploadState(id, TransferState.Error);
                return;
            }

            updateUploadState(id, TransferState.Progress);

            controls.current[id]
                .start(info)
                .then(() => {
                    // Update upload progress to 100%
                    const upload = uploads.find((upload) => upload.id === id);
                    if (upload) {
                        progresses.current[id] = upload.meta.size ?? 0;
                    }
                    updateUploadState(id, TransferState.Done);
                })
                .catch((error) => {
                    console.error(`Failed to upload: ${error}`);
                    updateUploadState(id, TransferState.Error, { error });
                });
        }
    }, [uploads]);

    const addToUploadQueue = async (
        file: File,
        metadataPromise: Promise<{ meta: TransferMeta; info: UploadInfo }>,
        callbacks: UploadCallbacks
    ) =>
        new Promise<void>((resolve, reject) => {
            const { id, uploadControls } = initUpload({
                ...callbacks,
                finalize: async (...args) => {
                    await callbacks.finalize(...args);
                    resolve();
                },
                onProgress: (bytes) => {
                    progresses.current[id] += bytes;
                    callbacks.onProgress?.(bytes);
                },
                onError: (err) => {
                    callbacks.onError?.(err);
                    reject(err);
                }
            });

            controls.current[id] = uploadControls;
            progresses.current[id] = 0;

            addNewUpload(id, file);

            metadataPromise
                .then(({ meta, info }) => {
                    updateUploadByID(id, {
                        meta,
                        info,
                        state: TransferState.Pending
                    });
                })
                .catch((error) => {
                    updateUploadState(id, TransferState.Error, { error });

                    reject(error);
                });
        });

    const getUploadsProgresses = () => ({ ...progresses.current });

    const getUploadsImmediate = () => {
        return uploadsRef.current;
    };

    return (
        <UploadContext.Provider
            value={{
                uploads,
                getUploadsImmediate,
                addToUploadQueue,
                getUploadsProgresses,
                clearUploads,
                removeUpload
            }}
        >
            {children}
        </UploadContext.Provider>
    );
};

export const useUploadProvider = (): UploadProviderState => {
    const state = useContext(UploadContext);
    if (!state) {
        throw new Error('Trying to use uninitialized UploadProvider');
    }
    return state;
};
