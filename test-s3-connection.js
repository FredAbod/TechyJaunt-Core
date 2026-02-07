import {
  S3Client,
  ListObjectsCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_BUCKET_NAME,
} from "./src/utils/helper/config.js";

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

async function testConnection() {
  console.log("Testing AWS S3 Connection...");
  console.log(`Region: ${AWS_REGION}`);
  console.log(`Bucket: ${AWS_BUCKET_NAME}`);

  try {
    // 1. List Objects (Test Read/List permissions)
    console.log("\n1. Testing ListObjects...");
    const listCmd = new ListObjectsCommand({
      Bucket: AWS_BUCKET_NAME,
      MaxKeys: 1,
    });
    await s3Client.send(listCmd);
    console.log("✅ ListObjects successful.");

    // 2. Upload File (Test Write permissions)
    console.log("\n2. Testing PutObject...");
    const testKey = `test-connection-${Date.now()}.txt`;
    const putCmd = new PutObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: testKey,
      Body: "Hello from TechyJaunt S3 Migration Test",
    });
    await s3Client.send(putCmd);
    console.log(`✅ PutObject successful (Key: ${testKey}).`);

    // 3. Delete File (Test Delete permissions)
    console.log("\n3. Testing DeleteObject...");
    const deleteCmd = new DeleteObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: testKey,
    });
    await s3Client.send(deleteCmd);
    console.log("✅ DeleteObject successful.");

    console.log("\n🎉 S3 Connection Verified Successfully!");
  } catch (error) {
    console.error("\n❌ S3 Connection Failed:", error.message);
    if (
      error.name === "InvalidAccessKeyId" ||
      error.name === "SignatureDoesNotMatch"
    ) {
      console.error("Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.");
    } else if (error.name === "NoSuchBucket") {
      console.error(
        `Check if bucket '${AWS_BUCKET_NAME}' exists in region '${AWS_REGION}'.`,
      );
    } else if (error.message.includes("region")) {
      console.error("Check your AWS_REGION.");
    }
  }
}

testConnection();
