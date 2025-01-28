import { standardResolver } from './standard-resolver';
import { useForm } from '@mantine/form';
import { act, renderHook } from '@testing-library/react';
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

describe.each([
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
])('Tests Schema - $library', ({ basicSchema, nestedSchema, listSchema, multiMessageSchema }) => {
  it('validates basic fields with given schema', () => {
    const hook = renderHook(() =>
      useForm({
        initialValues: {
          name: '',
          email: '',
          age: 16,
        },
        validate: standardResolver(basicSchema),
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
        validate: standardResolver(nestedSchema),
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
        validate: standardResolver(listSchema),
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
          validate: standardResolver(multiMessageSchema, options),
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
