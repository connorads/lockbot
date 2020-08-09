FROM node:10-slim

COPY package.json .
COPY yarn.lock .
RUN yarn

COPY . .

# Hack so that "serverless-offline" can access "dynamodb-local" in docker-compose
RUN sed -i 's/localhost:8000/dynamodb-local:8000/g' src/handlers/api.ts

EXPOSE 3000

ENTRYPOINT ["yarn"]
CMD ["dev", "--host", "0.0.0.0"]
