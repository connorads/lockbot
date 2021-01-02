/* eslint-disable no-template-curly-in-string */

const resourcesTable = {
  Type: "AWS::DynamoDB::Table",
  Properties: {
    TableName: "${self:custom.resourcesTableName}",
    AttributeDefinitions: [
      {
        AttributeName: "Resource",
        AttributeType: "S",
      },
      {
        AttributeName: "Group",
        AttributeType: "S",
      },
    ],
    KeySchema: [
      {
        AttributeName: "Group",
        KeyType: "HASH",
      },
      {
        AttributeName: "Resource",
        KeyType: "RANGE",
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 4,
      WriteCapacityUnits: 4,
    },
  },
};

export default resourcesTable;
