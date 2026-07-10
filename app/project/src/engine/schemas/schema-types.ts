import type { SyncPayloadType } from '@/domain';

export enum SchemaFieldKind {
  String = 'string',
  Number = 'number',
  Integer = 'integer',
  Boolean = 'boolean',
  Enum = 'enum',
  Object = 'object',
  Array = 'array',
  Union = 'union',
}

export interface BaseSchemaField {
  kind: SchemaFieldKind;
  description: string;
  required: boolean;
  nullable?: boolean;
}

export interface StringSchemaField extends BaseSchemaField {
  kind: SchemaFieldKind.String;
  format?: 'uuid' | 'rfc3339' | 'date' | 'ianaTimeZone';
}

export interface NumberSchemaField extends BaseSchemaField {
  kind: SchemaFieldKind.Number | SchemaFieldKind.Integer;
  minimum?: number;
  maximum?: number;
}

export interface BooleanSchemaField extends BaseSchemaField {
  kind: SchemaFieldKind.Boolean;
}

export interface EnumSchemaField extends BaseSchemaField {
  kind: SchemaFieldKind.Enum;
  values: readonly string[];
}

export interface ObjectSchemaField extends BaseSchemaField {
  kind: SchemaFieldKind.Object;
  properties: Readonly<Record<string, SchemaField>>;
  additionalProperties: boolean;
}

export interface ArraySchemaField extends BaseSchemaField {
  kind: SchemaFieldKind.Array;
  items: SchemaField;
  minItems?: number;
}

export interface UnionSchemaField extends BaseSchemaField {
  kind: SchemaFieldKind.Union;
  anyOf: readonly SchemaField[];
}

export type SchemaField =
  | StringSchemaField
  | NumberSchemaField
  | BooleanSchemaField
  | EnumSchemaField
  | ObjectSchemaField
  | ArraySchemaField
  | UnionSchemaField;

export interface PayloadSchemaDefinition<TPayload extends object> {
  schemaName: string;
  payloadType: SyncPayloadType;
  version: string;
  description: string;
  required: readonly (keyof TPayload & string)[];
  properties: {
    [K in keyof TPayload]-?: SchemaField;
  };
}
