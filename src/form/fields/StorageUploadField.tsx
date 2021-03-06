import * as React from "react";
import { useEffect } from "react";

import {
    Box,
    FormControl,
    FormHelperText,
    IconButton,
    LinearProgress,
    makeStyles,
    Paper,
    RootRef,
    Typography
} from "@material-ui/core";

import { getDownloadURL, uploadFile } from "../../firebase";
import { storage } from "firebase/app";


import {
    ArrayProperty,
    EntitySchema,
    Property,
    StorageMeta,
    StringProperty
} from "../../models";
import { getIn } from "formik";

import { CMSFieldProps } from "../form_props";
import { useDropzone } from "react-dropzone";
import ClearIcon from "@material-ui/icons/Clear";
import PreviewComponent from "../../preview/PreviewComponent";
import deepEqual from "deep-equal";
import { FieldDescription } from "../../components";
import { LabelWithIcon } from "../../components/LabelWithIcon";
import { useSnackbarContext } from "../../snackbar_controller";
import ErrorBoundary from "../../components/ErrorBoundary";
import { PreviewSize } from "../../preview/PreviewComponentProps";

export const useStyles = makeStyles(theme => ({
    dropZone: {
        position: "relative",
        transition: "background-color 200ms cubic-bezier(0.0, 0, 0.2, 1) 0ms",
        borderTopLeftRadius: "2px",
        borderTopRightRadius: "2px",
        backgroundColor: "rgba(0, 0, 0, 0.09)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.42)",
        "&:hover": {
            backgroundColor: "#dedede"
        }
    },
    activeDrop: {
        backgroundColor: "#dedede"
    },
    acceptDrop: {
        borderColor: theme.palette.success.main
    },
    rejectDrop: {
        borderColor: theme.palette.error.main
    },
    uploadItem: {
        padding: theme.spacing(1),
        minWidth: 220,
        minHeight: 220
    },
    uploadItemSmall: {
        padding: theme.spacing(1),
        minWidth: 118,
        minHeight: 118
    }
}));


type StorageUploadFieldProps = CMSFieldProps<string | string[]>;

/**
 * Internal representation of an item in the storage field.
 * It can have two states, having a storagePath set, which means the file has
 * been uploaded and it is rendered as a preview
 * Or have a pending file being uploaded.
 */
interface StorageFieldItem {
    storagePathOrDownloadUrl?: string;
    file?: File;
    metadata?: storage.UploadMetadata,
    size: PreviewSize
}

export default function StorageUploadField({
                                               field,
                                               form: { errors, touched, setFieldValue, setFieldTouched },
                                               property,
                                               includeDescription,
                                               entitySchema
                                           }: StorageUploadFieldProps) {

    const fieldError = getIn(errors, field.name);
    const showError = getIn(touched, field.name) && !!fieldError;

    const multipleFilesSupported = property.dataType === "array";

    const value = multipleFilesSupported ?
        (Array.isArray(field.value) ? field.value : []) :
        field.value;

    return (

        <FormControl fullWidth
                     required={property.validation?.required}
                     error={showError}>

            <FormHelperText filled
                            required={property.validation?.required}>
                <LabelWithIcon scaledIcon={true} property={property}/>
            </FormHelperText>

            <StorageUpload value={value}
                           property={property}
                           onChange={(newValue) => {
                               setFieldTouched(field.name);
                               setFieldValue(
                                   field.name,
                                   newValue
                               );
                           }}
                           entitySchema={entitySchema}
                           small={false}/>

            {includeDescription &&
            <FieldDescription property={property}/>}

            {showError && <FormHelperText
                id="component-error-text">{fieldError}</FormHelperText>}

        </FormControl>
    );
}

interface StorageUploadProps {
    value: string | string[];
    property: StringProperty | ArrayProperty<string>;
    onChange: (value: string | string[] | null) => void;
    small: boolean;
    entitySchema: EntitySchema;
}

export function StorageUpload({
                                  property,
                                  value,
                                  onChange,
                                  small,
                                  entitySchema
                              }: StorageUploadProps) {

    const multipleFilesSupported = property.dataType === "array";

    if (multipleFilesSupported) {
        const arrayProperty = property as ArrayProperty<string>;
        if ("dataType" in arrayProperty.of) {
            if (arrayProperty.of.dataType !== "string") {
                throw Error("Storage field using array must be of data type string");
            }
        } else {
            throw Error("Storage field using array must be of data type string");
        }
    }

    const storageMeta: StorageMeta | undefined = property.dataType === "string" ? property.config?.storageMeta :
        property.dataType === "array" &&
        (property.of as Property).dataType === "string" ? (property.of as StringProperty).config?.storageMeta :
            undefined;

    const metadata: storage.UploadMetadata | undefined = storageMeta?.metadata;

    if (!storageMeta)
        throw Error("Storage meta must be specified");

    const classes = useStyles();

    const size = multipleFilesSupported ? "small" : "regular";

    const internalInitialValue: StorageFieldItem[] =
        (multipleFilesSupported ?
            value as string[]
            : [value as string]).map(entry => (
            {
                storagePathOrDownloadUrl: entry,
                metadata: metadata,
                size: size
            }
        ));

    const [initialValue, setInitialValue] = React.useState<string | string[]>(value);
    const [internalValue, setInternalValue] = React.useState<StorageFieldItem[]>(internalInitialValue);

    if (!deepEqual(initialValue, value)) {
        setInitialValue(value);
        setInternalValue(internalInitialValue);
    }

    function removeDuplicates(items: StorageFieldItem[]) {
        return items.filter(
            (v, i) => {
                return ((items.map((v) => v.storagePathOrDownloadUrl).indexOf(v.storagePathOrDownloadUrl) === i) || !v.storagePathOrDownloadUrl)
                    && ((items.map((v) => v.file).indexOf(v.file) === i) || !v.file);
            }
        );
    }

    const onDrop = (acceptedFiles: File[]) => {

        let newInternalValue: StorageFieldItem[];
        if (multipleFilesSupported) {
            newInternalValue = [...internalValue,
                ...(acceptedFiles.map(file => ({
                    file,
                    metadata,
                    size: size
                } as StorageFieldItem)))];
        } else {
            newInternalValue = [{
                file: acceptedFiles[0],
                metadata,
                size: size
            }];
        }

        // Remove either storage path or file duplicates
        newInternalValue = removeDuplicates(newInternalValue);

        setInternalValue(newInternalValue);
    };

    const onFileUploadComplete = async (uploadedPath: string,
                                        file: File,
                                        metadata?: storage.UploadMetadata) => {

        console.debug("onFileUploadComplete", uploadedPath, file);

        let downloadUrl: string | undefined;
        if (storageMeta.storeUrl) {
            downloadUrl = await getDownloadURL(uploadedPath);
        }

        let item: StorageFieldItem | undefined = internalValue.find(
            entry => entry.file === file
                || entry.storagePathOrDownloadUrl === uploadedPath
                || entry.storagePathOrDownloadUrl === downloadUrl);

        let newValue: StorageFieldItem[];

        if (!item) {
            item = {
                storagePathOrDownloadUrl: storageMeta.storeUrl ? downloadUrl : uploadedPath,
                file: file,
                metadata: metadata,
                size: size
            };
            if (multipleFilesSupported)
                newValue = [...internalValue, item];
            else newValue = [item];
        } else {
            item.storagePathOrDownloadUrl = storageMeta.storeUrl ? downloadUrl : uploadedPath;
            item.file = file;
            item.metadata = metadata;
            newValue = [...internalValue];
        }
        newValue = removeDuplicates(newValue);
        setInternalValue(newValue);

        const fieldValue = newValue
            .filter(e => !!e.storagePathOrDownloadUrl)
            .map(e => e.storagePathOrDownloadUrl as string);

        if (multipleFilesSupported) {
            onChange(fieldValue);
        } else {
            onChange(fieldValue ? fieldValue[0] : null);
        }
    };

    const onClear = (clearedStoragePathOrDownloadUrl: string) => {
        if (multipleFilesSupported) {
            const newValue: StorageFieldItem[] = internalValue.filter(v => v.storagePathOrDownloadUrl !== clearedStoragePathOrDownloadUrl);
            onChange(newValue.filter(v => !!v.storagePathOrDownloadUrl).map(v => v.storagePathOrDownloadUrl as string));
            setInternalValue(newValue);
        } else {
            onChange(null);
            setInternalValue([]);
        }
    };

    const {
        getRootProps,
        getInputProps,
        isDragActive,
        isDragAccept,
        isDragReject
    } = useDropzone({
            accept: storageMeta.acceptedFiles,
            onDrop: onDrop
        }
    );

    const { ref, ...rootProps } = getRootProps();

    const helpText = multipleFilesSupported ?
        "Drag 'n' drop some files here, or click to select files" :
        "Drag 'n' drop a file here, or click to select one";

    return (

        <RootRef rootRef={ref}>

            <div {...rootProps}
                 className={`${classes.dropZone} ${isDragActive ? classes.activeDrop : ""} ${isDragReject ? classes.rejectDrop : ""} ${isDragAccept ? classes.acceptDrop : ""}`}
            >

                <input {...getInputProps()} />

                <Box display="flex"
                     flexDirection="row"
                     flexWrap="wrap"
                     alignItems="center"
                     justifyContent="center"
                     minHeight={250}>

                    {internalValue.map((entry, index) => {
                        if (entry.storagePathOrDownloadUrl) {
                            const renderProperty = multipleFilesSupported
                                ? (property as ArrayProperty<string>).of as Property
                                : property;
                            return (
                                <StorageItemPreview
                                    key={`storage_preview_${index}`}
                                    name={`storage_preview_${entry.storagePathOrDownloadUrl}`}
                                    property={renderProperty}
                                    value={entry.storagePathOrDownloadUrl}
                                    onClear={onClear}
                                    entitySchema={entitySchema}
                                    size={entry.size}/>
                            );
                        } else if (entry.file) {
                            return (
                                <StorageUploadProgress
                                    key={`storage_upload_${entry.file.name}`}
                                    file={entry.file}
                                    metadata={metadata}
                                    storagePath={storageMeta.storagePath}
                                    onFileUploadComplete={onFileUploadComplete}
                                    size={size}
                                />
                            );
                        }
                        return null;
                    })
                    }

                    <Box
                        flexGrow={1}
                        m={2}
                        maxWidth={small ? 100 : 200}>
                        <Typography color={"textSecondary"}
                                    variant={"body2"}
                                    align={"center"}>
                            {helpText}
                        </Typography>
                    </Box>

                </Box>

            </div>
        </RootRef>
    );

}


interface StorageUploadItemProps {
    storagePath: string;
    metadata?: storage.UploadMetadata,
    file: File,
    onFileUploadComplete: (value: string,
                           file: File,
                           metadata?: storage.UploadMetadata) => void;
    size: PreviewSize;
}

export function StorageUploadProgress({
                                          storagePath,
                                          file,
                                          metadata,
                                          onFileUploadComplete,
                                          size
                                      }: StorageUploadItemProps) {

    const classes = useStyles();
    const snackbarContext = useSnackbarContext();

    const [error, setError] = React.useState<string>();
    const [progress, setProgress] = React.useState<number>(-1);

    useEffect(() => {
        if (file)
            upload(file);
    }, []);

    function upload(file: File) {

        setError(undefined);
        setProgress(0);

        const uploadTask = uploadFile(file, storagePath, metadata);
        uploadTask.on("state_changed", (snapshot) => {
            const currentProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setProgress(currentProgress);
            console.debug("Upload is " + currentProgress + "% done");
            switch (snapshot.state) {
                case storage.TaskState.PAUSED: // or 'paused'
                    console.debug("Upload is paused");
                    break;
                case storage.TaskState.RUNNING: // or 'running'
                    console.debug("Upload is running");
                    break;
            }
        }, (e: any) => {
            console.error("Upload error", e);
            setError(e.message);
            setProgress(-1);
            snackbarContext.open({
                type: "error",
                title: "Error uploading file",
                message: e.message
            });

        }, () => {
            const fullPath = uploadTask.snapshot.ref.fullPath;
            setProgress(-1);
            onFileUploadComplete(fullPath, file, metadata);
        });
    }

    return (

        <Box m={1}>
            <Paper elevation={0}
                   className={size === "regular" ? classes.uploadItem : classes.uploadItemSmall}
                   variant={"outlined"}>

                {progress > -1 &&
                <LinearProgress variant="indeterminate"
                                value={progress}/>}

                {error && <p>Error uploading file: {error}</p>}

            </Paper>
        </Box>

    )
        ;

}

interface StorageItemPreviewProps {
    name: string;
    property: Property;
    value: string,
    onClear: (value: string) => void;
    entitySchema: EntitySchema;
    size: PreviewSize;
}

export function StorageItemPreview({
                                       name,
                                       property,
                                       value,
                                       onClear,
                                       entitySchema,
                                       size
                                   }: StorageItemPreviewProps) {

    const classes = useStyles();
    return (
        <Box m={1} position={"relative"}>

            <Paper
                elevation={0}
                className={size === "regular" ? classes.uploadItem : classes.uploadItemSmall}
                variant={"outlined"}>

                <Box position={"absolute"}
                     top={-8}
                     right={-8}
                     style={{ zIndex: 100 }}>
                    <IconButton
                        style={{ backgroundColor: "white" }}
                        onClick={(event) => {
                            event.stopPropagation();
                            onClear(value);
                        }}>
                        <ClearIcon fontSize={"small"}/>
                    </IconButton>
                </Box>

                {value &&
                <ErrorBoundary>
                    <PreviewComponent name={name}
                                      value={value}
                                      property={property}
                                      size={size}
                                      entitySchema={entitySchema}/>
                </ErrorBoundary>
                }
            </Paper>

        </Box>
    );

}
