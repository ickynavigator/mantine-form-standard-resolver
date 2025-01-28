import { standardResolver } from './standard-resolver';
import { useForm } from '@mantine/form';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { act, renderHook } from '@testing-library/react';
import { type } from 'arktype';
import * as v from 'valibot';
import { z } from 'zod';

const ERRORS = {
  name: 'Name should have at least 2 letters',
  email: 'Invalid email',
  age: 'You must be at least 18 to create an account',
  'nested.field': 'Field should have at least 2 letters',

  mandatoryHashMessage: 'There must be a # in the hashtag',
  notEmptyMessage: 'Hashtag should not be empty',
} as const;

type Validation = {
  library: string;
  basicSchema: StandardSchemaV1;
  nestedSchema: StandardSchemaV1;
  listSchema: StandardSchemaV1;
  multiMessageSchema: StandardSchemaV1;
};

const validations = [
  {
    library: 'Zod',
    basicSchema: z.object({
      name: z.string().min(2, { message: ERRORS.name }),
      email: z.string().email({ message: ERRORS.email }),
      age: z.number().min(18, { message: ERRORS.age }),
    }),
    nestedSchema: z.object({
      nested: z.object({
        field: z.string().min(2, { message: ERRORS['nested.field'] }),
      }),
    }),
    listSchema: z.object({
      list: z.array(
        z.object({
          name: z.string().min(2, { message: ERRORS.name }),
        })
      ),
    }),
    multiMessageSchema: z.object({
      hashtag: z
        .string()
        .refine((value) => value.length > 0, { message: ERRORS.notEmptyMessage })
        .refine((value) => value.includes('#'), { message: ERRORS.mandatoryHashMessage }),
    }),
  },
  {
    library: 'Valibot',
    basicSchema: v.object({
      name: v.pipe(v.string(), v.minLength(2, ERRORS.name)),
      email: v.pipe(v.string(), v.email(ERRORS.email)),
      age: v.pipe(v.number(), v.minValue(18, ERRORS.age)),
    }),
    nestedSchema: v.object({
      nested: v.object({
        field: v.pipe(v.string(), v.minLength(2, ERRORS['nested.field'])),
      }),
    }),
    listSchema: v.object({
      list: v.array(
        v.object({
          name: v.pipe(v.string(), v.minLength(2, ERRORS.name)),
        })
      ),
    }),
    multiMessageSchema: v.object({
      hashtag: v.pipe(
        v.string(),
        v.minLength(1, ERRORS.notEmptyMessage),
        v.includes('#', ERRORS.mandatoryHashMessage)
      ),
    }),
  },
  {
    library: 'Arktype',
    basicSchema: type({
      name: type('string >= 2').configure({ message: () => ERRORS.name }),
      email: type('string.email').configure({ message: () => ERRORS.email }),
      age: type('number >= 18').configure({ message: () => ERRORS.age }),
    }),
    nestedSchema: type({
      nested: {
        field: type('string >= 2').configure({ message: () => ERRORS['nested.field'] }),
      },
    }),
    listSchema: type({
      list: type({
        name: type('string >= 2').configure({ message: () => ERRORS.name }),
      }).array(),
    }),
    multiMessageSchema: type({
      // TODO: update pipe setup for arktype multiple messages validation
      hashtag: type('string')
        .narrow((value, ctx) => {
          if (value.length <= 0) {
            ctx.errors.add(
              ctx.error({
                description: ERRORS.notEmptyMessage,
                message: ERRORS.notEmptyMessage,
                predicate: { name: 'length' },
              })
            );
          }

          if (!value.includes('#')) {
            ctx.errors.add(
              ctx.error({
                description: ERRORS.mandatoryHashMessage,
                message: ERRORS.mandatoryHashMessage,
                predicate: { name: 'include' },
              })
            );
          }

          return ctx.hasError();
        })
    }),
  },
] satisfies Validation[];

describe.each(validations)('Tests Schema - $library', (validation) => {
  it('validates basic fields with given schema', () => {
    const hook = renderHook(() =>
      useForm({
        initialValues: {
          name: '',
          email: '',
          age: 16,
        },
        validate: standardResolver(validation.basicSchema),
      })
    );

    expect(hook.result.current.errors).toStrictEqual({});
    act(() => hook.result.current.validate());

    expect(hook.result.current.errors).toStrictEqual({
      name: ERRORS.name,
      email: ERRORS.email,
      age: ERRORS.age,
    });

    act(() => hook.result.current.setValues({ name: 'John', email: 'john@email.com', age: 16 }));
    act(() => hook.result.current.validate());

    expect(hook.result.current.errors).toStrictEqual({
      age: ERRORS.age,
    });
  });

  it('validates nested fields with given schema', () => {
    const hook = renderHook(() =>
      useForm({
        initialValues: {
          nested: {
            field: '',
          },
        },
        validate: standardResolver(validation.nestedSchema),
      })
    );

    expect(hook.result.current.errors).toStrictEqual({});
    act(() => hook.result.current.validate());

    expect(hook.result.current.errors).toStrictEqual({
      'nested.field': ERRORS['nested.field'],
    });

    act(() => hook.result.current.setValues({ nested: { field: 'John' } }));
    act(() => hook.result.current.validate());

    expect(hook.result.current.errors).toStrictEqual({});
  });

  it('validates list fields with given zod schema', () => {
    const hook = renderHook(() =>
      useForm({
        initialValues: {
          list: [{ name: '' }],
        },
        validate: standardResolver(validation.listSchema),
      })
    );

    expect(hook.result.current.errors).toStrictEqual({});
    act(() => hook.result.current.validate());

    expect(hook.result.current.errors).toStrictEqual({
      'list.0.name': ERRORS.name,
    });

    act(() => hook.result.current.setValues({ list: [{ name: 'John' }] }));
    act(() => hook.result.current.validate());

    expect(hook.result.current.errors).toStrictEqual({});
  });

  it.each([
    [{ errorPriority: 'first' as const }, ERRORS.notEmptyMessage],
    [{ errorPriority: 'last' as const }, ERRORS.mandatoryHashMessage],
    [undefined, ERRORS.mandatoryHashMessage],
  ])(
    `provides the proper error for a schema with multiple messages for a field with resolver option %p.`,
    (options, expectedErrorMessage) => {
      const hook = renderHook(() =>
        useForm({
          initialValues: {
            hashtag: '',
          },
          validate: standardResolver(validation.multiMessageSchema, options),
        })
      );

      expect(hook.result.current.errors).toStrictEqual({});
      act(() => hook.result.current.validate());

      expect(hook.result.current.errors).toStrictEqual({
        hashtag: expectedErrorMessage,
      });
    }
  );
});
