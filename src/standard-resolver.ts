import type { FormErrors } from '@mantine/form';
import type { StandardSchemaV1 } from '@standard-schema/spec';

export interface ResolverOptions {
  errorPriority?: 'first' | 'last';
}

export function standardResolver<T extends StandardSchemaV1>(schema: T, options?: ResolverOptions) {
  return (values: Record<string, unknown>): FormErrors => {
    const parsed = schema['~standard'].validate(values);

    if (parsed instanceof Promise) {
      throw new TypeError('Schema validation must be synchronous');
    }

    const results: FormErrors = {};

    if (parsed.issues) {
      const issues = [...parsed.issues];

      if (options?.errorPriority === 'first') {
        issues.reverse();
      }

      issues.forEach((error) => {
        if (error.path) {
          results[error.path.map(extractPath).join('.')] = error.message;
        }
      });
    }

    return results;
  };
}

function extractPath(path: StandardSchemaV1.PathSegment | PropertyKey): PropertyKey {
  if (typeof path === 'object') {
    return path.key;
  }

  return path;
}
