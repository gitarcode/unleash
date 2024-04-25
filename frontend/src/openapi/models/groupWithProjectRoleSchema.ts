/**
 * Generated by Orval
 * Do not edit manually.
 * See `gen:api` script in package.json
 */
import type { GroupUserModelSchema } from './groupUserModelSchema';

/**
 * Data about a group including their project role
 */
export interface GroupWithProjectRoleSchema {
    /** When this group was added to the project */
    addedAt?: string;
    /** When was this group created */
    createdAt?: string | null;
    /** A user who created this group */
    createdBy?: string | null;
    /** A custom description of the group */
    description?: string | null;
    /** The group's ID in the Unleash system */
    id: number;
    /** A list of SSO groups that should map to this Unleash group */
    mappingsSSO?: string[];
    /** The name of the group */
    name?: string;
    /** The ID of the role this group has in the given project */
    roleId?: number;
    /** A list of roles this user has in the given project */
    roles?: number[];
    /** A role id that is used as the root role for all users in this group. This can be either the id of the Viewer, Editor or Admin role. */
    rootRole?: number | null;
    /** The SCIM ID of the group, only present if managed by SCIM */
    scimId?: string | null;
    /** A list of users belonging to this group */
    users?: GroupUserModelSchema[];
}
