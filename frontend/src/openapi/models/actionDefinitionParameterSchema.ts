/**
 * Generated by Orval
 * Do not edit manually.
 * See `gen:api` script in package.json
 */
import type { ActionDefinitionParameterSchemaName } from './actionDefinitionParameterSchemaName';
import type { ActionDefinitionParameterSchemaType } from './actionDefinitionParameterSchemaType';

/**
 * Defines a parameter for an action.
 */
export interface ActionDefinitionParameterSchema {
    /** The label of the parameter. */
    label: string;
    /** The name of the parameter. */
    name: ActionDefinitionParameterSchemaName;
    /** Whether the parameter is optional. */
    optional?: boolean;
    /** Lists of options to be used for the parameter. */
    options?: string[];
    /** The parameter type. */
    type: ActionDefinitionParameterSchemaType;
}
