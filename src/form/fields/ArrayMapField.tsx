import { MapProperty, Properties } from "../../models";
import { FieldArray, getIn } from "formik";
import {
    Box,
    Button,
    FormControl,
    FormHelperText,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableRow
} from "@material-ui/core";
import React from "react";
import { Add, Remove } from "@material-ui/icons";
import { formStyles } from "../../styles";
import { CMSFieldProps } from "../form_props";
import { FieldDescription } from "../../components";
import { FormFieldProps } from "../index";

type ArrayMapFieldProps<T> = CMSFieldProps<T[]>;

export default function ArrayMapField<T>({
                                             field,
                                             form: { errors, touched },
                                             property,
                                             createFormField,
                                             includeDescription,
                                             underlyingValueHasChanged,
                                             entitySchema
                                         }: ArrayMapFieldProps<T>) {

    if (!("dataType" in property.of) || property.of.dataType !== "map") {
        console.error(property);
        throw Error("Field misconfiguration: this array field should have type map");
    }

    const classes = formStyles();
    const mapProperty: MapProperty<T> = property.of as MapProperty<T>;
    const properties: Properties = mapProperty.properties;

    const fieldError = getIn(errors, field.name);
    const showError = getIn(touched, field.name) && !!fieldError;
    const hasValue = field.value && field.value.length > 0;

    return <FieldArray
        name={field.name}
        render={arrayHelpers => {


            return (

                <FormControl fullWidth error={showError}>

                    <FormHelperText filled
                                    required={property.validation?.required}>
                        {property.title}
                    </FormHelperText>

                    <Paper variant={"outlined"} className={classes.paper}>

                        {hasValue ? (
                            <Table>
                                <TableBody>
                                    {field.value.map((entryValue: any, index: number) => (
                                        <TableRow key={`field_${index}`}>
                                            {Object.entries(properties).map(([arrayKey, childProperty]) => {
                                                return (
                                                    <TableCell
                                                        key={`field_${arrayKey}`}>
                                                        {createFormField(
                                                            {
                                                                name:`${field.name}[${index}].${arrayKey}`,
                                                                property:childProperty,
                                                                includeDescription,
                                                                underlyingValueHasChanged,
                                                                entitySchema,
                                                                partOfArray: false
                                                            })}
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell size={"small"}
                                                       padding={"none"}>
                                                <IconButton aria-label="remove"
                                                            onClick={() => arrayHelpers.remove(index)}>
                                                    <Remove/>
                                                </IconButton>
                                            </TableCell>
                                            <TableCell size={"small"}
                                                       padding={"none"}>
                                                <IconButton aria-label="insert"
                                                            onClick={() => arrayHelpers.insert(index + 1, {})}>
                                                    <Add/>
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <Box margin={2}>
                                <Button onClick={() => arrayHelpers.push(null)}>
                                    {/* show this when user has removed all entries from the list */}
                                    Add
                                </Button>
                            </Box>
                        )}
                    </Paper>

                    {includeDescription &&
                    <FieldDescription property={property}/>}

                    {showError && <FormHelperText
                        id="component-error-text">{fieldError}</FormHelperText>}

                </FormControl>
            );
        }}
    />;

}
