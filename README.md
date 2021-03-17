# BSc (Hons) in Creative Computing - Year 4

## Cloud Application Development - CA#2 Scenario 2

### Description

A [Serverless](https://www.serverless.com/) application converted from a Node.JS/Express Mongoose API.

The application utilizes serverless to automate the AWS proceedure of creating API routes, Lambda functions, Layers, S3 Buckets. It also allows the application to be easily converted to another cloud provider if required.

### What you need to run this code

1. Node (14.15.4)
2. NPM (7.5.2)
3. Serverless (2.30.1)

### How to run this code

1. Clone this repository to your local machine.
2. Create a [Serverless](https://app.serverless.com/) account, download the CLI
3. The application requires the following parameters set in your serverless dashboard
   - `DB_ATLAS_URL` - MongoDB Database URI
   - `aws_access_key_id` - AWS access key
   - `aws_secret_access_key` - AWS Secret
   - `aws_session_token` - AWS Session token
4. Run `sls deploy` to deploy the application
