import { Entity, EntitySchema } from "../models";
import React, { useState } from "react";
import { deleteEntity } from "../firebase/firestore";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import { DialogContent } from "@material-ui/core";
import EntityPreview from "../preview/EntityPreview";
import { CircularProgressCenter } from "../components";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";
import { useSnackbarContext } from "../snackbar_controller";


export interface DeleteEntityDialogProps<S extends EntitySchema> {
    entity?: Entity<S>,
    schema: S
    open: boolean;
    afterDelete?: () => void;
    onClose: () => void;
}

export default function DeleteEntityDialog<S extends EntitySchema>(props: DeleteEntityDialogProps<S>) {

    const snackbarContext = useSnackbarContext();

    const { entity, schema, onClose, open, ...other } = props;
    const [loading, setLoading] = useState(false);

    const handleCancel = () => {
        onClose();
    };

    const handleOk = () => {
        if (entity) {
            snackbarContext.open({
                type: "success",
                message: "Deleted"
            })
            setLoading(true);
            deleteEntity(entity).then(_ => {
                setLoading(false);
                if(props.afterDelete) props.afterDelete()
            });
            onClose();
        }
    };

    return (
        <React.Fragment>

            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                maxWidth="md"
                keepMounted
                aria-labelledby="confirmation-dialog-title"
                open={open}
                onBackdropClick={onClose}
                {...other}
            >
                <DialogTitle id="confirmation-dialog-title">
                    Would you like to delete this {schema.name}?
                </DialogTitle>

                <DialogContent dividers>
                    {entity && <EntityPreview entity={entity} schema={schema}/>}
                </DialogContent>

                {loading && <CircularProgressCenter/>}

                {!loading &&
                <DialogActions>
                    <Button autoFocus onClick={handleCancel}
                            color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleOk} color="primary">
                        Ok
                    </Button>
                </DialogActions>}

            </Dialog>


        </React.Fragment>
    );
}

