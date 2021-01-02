/* eslint-disable no-template-curly-in-string */

const accessTokenTable = {
  Type: "AWS::DynamoDB::Table",
  Properties: {
    TableName: "${self:custom.accessTokensTableName}",
    AttributeDefinitions: [
      {
        AttributeName: "Scope",
        AttributeType: "S",
      },
    ],
    KeySchema: [
      {
        AttributeName: "Scope",
        KeyType: "HASH",
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 4,
      WriteCapacityUnits: 2,
    },
  },
};

export default accessTokenTable;
