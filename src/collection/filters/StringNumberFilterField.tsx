import { NumberProperty, StringProperty } from "../../models";
import { Field } from "formik";
import {
    FormControl,
    Grid,
    MenuItem,
    Select as MuiSelect,
    TextField as MuiTextField
} from "@material-ui/core";
import React, { useState } from "react";
import { FieldProps } from "formik/dist/Field";
import { renderPreviewEnumChip } from "../../preview/PreviewComponent";

interface StringNumberFilterFieldProps {
    name: string,
    property: StringProperty | NumberProperty,
}

export default function StringNumberFilterField({ name, property }: StringNumberFilterFieldProps) {

    const enumValues = property.config?.enumValues;

    return (
        <Field
            name={`${name}`}
        >
            {({
                  field,
                  form: { setFieldValue },
                  ...props
              }: FieldProps) => {

                const [fieldOperation, fieldValue] = field.value ? field.value : ["==", undefined];
                const [operation, setOperation] = useState<string>(fieldOperation);
                const [internalValue, setInternalValue] = useState<string | number>(fieldValue);

                function updateFilter(op: string, val: string | number) {
                    setOperation(op);
                    setInternalValue(val);
                    if (op && val) {
                        setFieldValue(
                            name,
                            [op, val]
                        );
                    } else {
                        setFieldValue(
                            name,
                            undefined
                        );
                    }
                }

                return (

                    <FormControl
                        fullWidth>
                        <Grid container>
                            <Grid item xs={3}>
                                <MuiSelect value={operation}
                                           autoWidth
                                           onChange={(evt: any) => {
                                               updateFilter(evt.target.value, internalValue);
                                           }}>
                                    <MenuItem value={"=="}>==</MenuItem>
                                    <MenuItem value={">"}>{">"}</MenuItem>
                                    <MenuItem value={"<"}>{"<"}</MenuItem>
                                    <MenuItem value={">="}>{">="}</MenuItem>
                                    <MenuItem value={"<="}>{"<="}</MenuItem>
                                </MuiSelect>
                            </Grid>

                            {!enumValues && <Grid item xs={9}>
                                <MuiTextField
                                    key={`filter-${name}`}
                                    type={property.dataType === "number" ? "number" : undefined}
                                    value={internalValue}
                                    onChange={(evt) => {
                                        const val = property.dataType === "number" ?
                                            parseFloat(evt.target.value)
                                            : evt.target.value;
                                        updateFilter(operation, val);
                                    }}
                                />
                            </Grid>}

                            {enumValues && <Grid item xs={9}>
                                <MuiSelect
                                    fullWidth
                                    key={`filter-${name}`}
                                    value={!!internalValue ? internalValue : ""}
                                    onChange={(evt: any) => {
                                        updateFilter(operation, evt.target.value);
                                    }}>
                                    {Object.entries(enumValues).map(([key, value]) => (
                                        <MenuItem key={`select-${key}`}
                                                  value={key}>
                                            {renderPreviewEnumChip(field.name, enumValues, key, "regular")}
                                        </MenuItem>
                                    ))}
                                </MuiSelect>
                            </Grid>}

                        </Grid>
                    </FormControl>
                );
            }}
        </Field>
    );

}
