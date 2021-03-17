module.exports = buildS3URL = (image) =>
  `https://${process.env.aws_bucket_name}.s3.amazonaws.com/${image}`;
