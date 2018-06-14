# Converter that reads NOMAD's metainfo and writes JSON schema.

## Getting started

### Requirements
*Node.js* and *NPM* (or better *yarn*)

### Run it

```
npm install
npm run converter
npm run validate
```

or

```
yarn
yarn run converter
yarn run validate
```

Will read [../schema/optimade.nomadmetainfo.json](../schema/optimade.nomadmetainfo.json) and write JSON schema to stdout.

## Limits

- was written with too much coffee
- currently only properly converts one dimensional tensors
- does not deal with references yet
- does not support meta-info's abstract types
- *testing* ?!