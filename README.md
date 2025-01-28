# mantine-form-standard-resolver

[![npm version](https://badgen.net/npm/v/mantine-form-standard-resolver)](https://npm.im/mantine-form-standard-resolver)

Uses the [Standard Schema Interface](https://standardschema.dev/) to validate form fields with any validation library that supports it.

## Installation

With yarn:

```sh
yarn add mantine-form-standard-resolver
```

With npm:

```sh
npm install mantine-form-standard-resolver
```

## Basic fields validation

```tsx
import { useForm } from '@mantine/form';
import { standardResolver } from 'mantine-form-standard-resolver';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, { message: 'Name should have at least 2 letters' }),
  email: z.string().email({ message: 'Invalid email' }),
  age: z.number().min(18, { message: 'You must be at least 18 to create an account' }),
});

const form = useForm({
  initialValues: {
    name: '',
    email: '',
    age: 16,
  },
  validate: standardResolver(schema),
});

form.validate();
form.errors;
// -> {
//  name: 'Name should have at least 2 letters',
//  email: 'Invalid email',
//  age: 'You must be at least 18 to create an account'
// }
```

## Nested fields validation

```tsx
import { useForm } from '@mantine/form';
import { standardResolver } from 'mantine-form-standard-resolver';
import { z } from 'zod';

const nestedSchema = z.object({
  nested: z.object({
    field: z.string().min(2, { message: 'Field should have at least 2 letters' }),
  }),
});

const form = useForm({
  initialValues: {
    nested: {
      field: '',
    },
  },
  validate: standardResolver(nestedSchema),
});

form.validate();
form.errors;
// -> {
//  'nested.field': 'Field should have at least 2 letters',
// }
```

## List fields validation

```tsx
import { useForm } from '@mantine/form';
import { standardResolver } from 'mantine-form-standard-resolver';
import { z } from 'zod';

const listSchema = z.object({
  list: z.array(
    z.object({
      name: z.string().min(2, { message: 'Name should have at least 2 letters' }),
    })
  ),
});

const form = useForm({
  initialValues: {
    list: [{ name: '' }],
  },
  validate: standardResolver(listSchema),
});

form.validate();
form.errors;
// -> {
//  'list.0.name': 'Name should have at least 2 letters',
// }
```

## License

MIT
