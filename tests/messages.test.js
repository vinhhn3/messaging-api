// tests/messages.test.js
const request = require("supertest"); // Used for making HTTP requests to the Express app
const app = require("../app"); // Import your Express app
const db = require("../models"); // Import your database models
const { User, Message, MessageRecipient } = db; // Destructure necessary models

// Use a separate in-memory SQLite database for testing
process.env.NODE_ENV = "test";

let server; // To hold the server instance
let testUserA, testUserB, testUserC; // To hold test user data for message tests
let createdMessageId; // To store the ID of a message created during tests

beforeAll(async () => {
  // Synchronize the database before all tests run
  await db.sequelize.sync({ force: true });

  // Start the server on a different port for testing (e.g., 8003)
  server = app.listen(8003, () => {
    console.log("Test server for messages running on port 8003");
  });

  // Create test users for message sending/retrieval
  const userARes = await request(server)
    .post("/users")
    .send({ email: "user.a@example.com", name: "User A" });
  testUserA = userARes.body.user;

  const userBRes = await request(server)
    .post("/users")
    .send({ email: "user.b@example.com", name: "User B" });
  testUserB = userBRes.body.user;

  const userCRes = await request(server)
    .post("/users")
    .send({ email: "user.c@example.com", name: "User C" });
  testUserC = userCRes.body.user;
});

afterAll(async () => {
  // Close the server after all tests are done
  server.close();
  // Close the database connection
  await db.sequelize.close();
});

describe("Message API - General Endpoints", () => {
  // Test for POST /messages
  describe("POST /messages", () => {
    test("should send a message to a single recipient successfully", async () => {
      const res = await request(server)
        .post("/messages")
        .send({
          senderId: testUserA.id,
          recipientIds: [testUserB.id],
          subject: "Single Recipient Test",
          content: "This is a message to a single person.",
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty("message", "Message sent successfully");
      expect(res.body.sentMessage).toHaveProperty("id");
      expect(res.body.sentMessage.senderId).toEqual(testUserA.id);
      expect(res.body.sentMessage.recipients).toEqual([testUserB.id]);
      expect(res.body.sentMessage.subject).toEqual("Single Recipient Test");
      expect(res.body.sentMessage.content).toEqual(
        "This is a message to a single person."
      );
      createdMessageId = res.body.sentMessage.id; // Store for GET test
    });

    test("should send a message to multiple recipients successfully", async () => {
      const res = await request(server)
        .post("/messages")
        .send({
          senderId: testUserA.id,
          recipientIds: [testUserB.id, testUserC.id],
          subject: "Multi-Recipient Test",
          content: "This is a message to multiple people.",
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty("message", "Message sent successfully");
      expect(res.body.sentMessage).toHaveProperty("id");
      expect(res.body.sentMessage.senderId).toEqual(testUserA.id);
      expect(res.body.sentMessage.recipients).toEqual(
        expect.arrayContaining([testUserB.id, testUserC.id])
      );
      expect(res.body.sentMessage.recipients).toHaveLength(2);
    });

    test("should return 400 if senderId, recipientIds, or content is missing", async () => {
      const res1 = await request(server)
        .post("/messages")
        .send({ recipientIds: [testUserB.id], content: "Missing sender" });
      expect(res1.statusCode).toEqual(400);
      expect(res1.body).toHaveProperty(
        "error",
        "Sender ID, at least one recipient ID, and content are required."
      );

      const res2 = await request(server)
        .post("/messages")
        .send({ senderId: testUserA.id, content: "Missing recipients" });
      expect(res2.statusCode).toEqual(400);
      expect(res2.body).toHaveProperty(
        "error",
        "Sender ID, at least one recipient ID, and content are required."
      );

      const res3 = await request(server)
        .post("/messages")
        .send({ senderId: testUserA.id, recipientIds: [testUserB.id] });
      expect(res3.statusCode).toEqual(400);
      expect(res3.body).toHaveProperty(
        "error",
        "Sender ID, at least one recipient ID, and content are required."
      );
    });

    test("should return 404 if sender not found", async () => {
      const nonExistentId = "b0b0b0b0-b0b0-4b0b-b0b0-b0b0b0b0b0b0";
      const res = await request(server)
        .post("/messages")
        .send({
          senderId: nonExistentId,
          recipientIds: [testUserB.id],
          subject: "Invalid Sender",
          content: "This message has an invalid sender.",
        });
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("error", "Sender not found.");
    });

    test("should return 404 if one or more recipients not found", async () => {
      const nonExistentId = "c0c0c0c0-c0c0-4c0c-c0c0-c0c0c0c0c0c0";
      const res = await request(server)
        .post("/messages")
        .send({
          senderId: testUserA.id,
          recipientIds: [testUserB.id, nonExistentId],
          subject: "Invalid Recipient",
          content: "This message has an invalid recipient.",
        });
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty(
        "error",
        "One or more recipient IDs are invalid or do not exist."
      );
    });

    test("should return 400 if no valid recipients after filtering sender and duplicates", async () => {
      const res = await request(server)
        .post("/messages")
        .send({
          senderId: testUserA.id,
          recipientIds: [testUserA.id, testUserA.id], // Sender is also a recipient, and duplicates
          subject: "Invalid Recipient List",
          content: "This message has no valid recipients after filtering.",
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty(
        "error",
        "No valid recipients provided. Recipients cannot be the sender, and duplicates are removed."
      );
    });
  });

  // Test for GET /messages/:id
  describe("GET /messages/:id", () => {
    test("should retrieve a specific message with all its recipients", async () => {
      // Ensure a message was created in the POST tests
      expect(createdMessageId).toBeDefined();

      const res = await request(server).get(`/messages/${createdMessageId}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message.id).toEqual(createdMessageId);
      expect(res.body.message.sender.id).toEqual(testUserA.id);
      expect(res.body.message.subject).toEqual("Single Recipient Test");
      expect(res.body.message.content).toEqual(
        "This is a message to a single person."
      );

      // Check recipients
      expect(res.body.message.recipients).toHaveLength(1);
      expect(res.body.message.recipients[0].recipient.id).toEqual(testUserB.id);
      expect(res.body.message.recipients[0].read).toBe(false); // Should be unread initially
    });

    test("should return 404 if message not found", async () => {
      const nonExistentId = "d0d0d0d0-d0d0-4d0d-d0d0-d0d0d0d0d0d0"; // A valid UUID format, but non-existent
      const res = await request(server).get(`/messages/${nonExistentId}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("error", "Message not found.");
    });
  });
});
