// tests/users.test.js
const request = require("supertest"); // Used for making HTTP requests to the Express app
const app = require("../app"); // Import your Express app
const db = require("../models"); // Import your database models
const { User, Message, MessageRecipient } = db; // Destructure the necessary models

// Use a separate in-memory SQLite database for testing
// This ensures tests don't interfere with your development database
process.env.NODE_ENV = "test";

let server; // To hold the server instance
let testUser1, testUser2, testUser3; // To hold test user data
let testMessage1, testMessage2; // To hold test message data
let testMessageRecipient1; // To hold a specific message recipient entry for read status tests

beforeAll(async () => {
  // Synchronize the database before all tests run
  // `force: true` will drop existing tables and re-create them
  // This ensures a clean slate for each test run
  await db.sequelize.sync({ force: true });

  // Start the server on a different port for testing to avoid conflicts
  // Using port 8002 for all tests in this file
  server = app.listen(8002, () => {
    console.log(
      "Test server running on port 8002 for all user and message tests"
    );
  });

  // --- Setup for User Management, Messaging, and Read Status Tests ---

  // Create test users
  const user1Res = await request(server)
    .post("/users")
    .send({ email: "testuser1@example.com", name: "Test User One" });
  testUser1 = user1Res.body.user;

  const user2Res = await request(server)
    .post("/users")
    .send({ email: "testuser2@example.com", name: "Test User Two" });
  testUser2 = user2Res.body.user;

  const user3Res = await request(server)
    .post("/users")
    .send({ email: "testuser3@example.com", name: "Test User Three" });
  testUser3 = user3Res.body.user;

  // Send test messages
  // Message 1: From TestUser1 to TestUser2 (will be used for inbox/read status)
  const msg1Res = await request(server)
    .post("/messages")
    .send({
      senderId: testUser1.id,
      recipientIds: [testUser2.id],
      subject: "Subject for TestUser2 Inbox",
      content: "Content for TestUser2 inbox message.",
    });
  testMessage1 = msg1Res.body.sentMessage;

  // Get the specific MessageRecipient entry for testMessage1 to TestUser2
  const messageRecipientsForMsg1 = await MessageRecipient.findAll({
    where: { messageId: testMessage1.id, recipientId: testUser2.id },
  });
  testMessageRecipient1 = messageRecipientsForMsg1[0]; // Should be only one

  // Message 2: From TestUser1 to TestUser3 (another sent message for TestUser1)
  const msg2Res = await request(server)
    .post("/messages")
    .send({
      senderId: testUser1.id,
      recipientIds: [testUser3.id],
      subject: "Subject for TestUser3 Inbox",
      content: "Content for TestUser3 inbox message.",
    });
  testMessage2 = msg2Res.body.sentMessage;
});

afterAll(async () => {
  // Close the server after all tests are done
  server.close();
  // Close the database connection
  await db.sequelize.close();
});

describe("API Endpoints Comprehensive Tests", () => {
  // --- User Management Tests ---
  describe("User Management", () => {
    test("POST /users - should create a new user successfully", async () => {
      const res = await request(server).post("/users").send({
        email: "newuser_post_test@example.com",
        name: "New User Post",
      });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty("message", "User created successfully");
      expect(res.body.user).toHaveProperty("id");
      expect(res.body.user.email).toEqual("newuser_post_test@example.com");
      expect(res.body.user.name).toEqual("New User Post");
      expect(res.body.user).toHaveProperty("createdAt");
    });

    test("POST /users - should return 409 if user with email already exists", async () => {
      const res = await request(server).post("/users").send({
        email: testUser1.email, // Using an existing email
        name: "Duplicate User",
      });

      expect(res.statusCode).toEqual(409);
      expect(res.body).toHaveProperty(
        "error",
        "User with this email already exists."
      );
    });

    test("POST /users - should return 400 if email or name is missing", async () => {
      const res1 = await request(server)
        .post("/users")
        .send({ name: "Missing Email" });

      expect(res1.statusCode).toEqual(400);
      expect(res1.body).toHaveProperty("error", "Email and name are required.");

      const res2 = await request(server)
        .post("/users")
        .send({ email: "missingname2@example.com" });

      expect(res2.statusCode).toEqual(400);
      expect(res2.body).toHaveProperty("error", "Email and name are required.");
    });

    test("GET /users/:id - should retrieve user info by ID successfully", async () => {
      const res = await request(server).get(`/users/${testUser1.id}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("user");
      expect(res.body.user.id).toEqual(testUser1.id);
      expect(res.body.user.email).toEqual(testUser1.email);
      expect(res.body.user.name).toEqual(testUser1.name);
    });

    test("GET /users/:id - should return 404 if user not found", async () => {
      const nonExistentId = "a0a0a0a0-a0a0-4a0a-a0a0-a0a0a0a0a0a0"; // A valid UUID format, but non-existent
      const res = await request(server).get(`/users/${nonExistentId}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("error", "User not found.");
    });

    test("GET /users - should list all users successfully", async () => {
      const res = await request(server).get("/users");

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("users");
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThanOrEqual(3); // At least testUser1, testUser2, testUser3

      const foundUser1 = res.body.users.find(
        (user) => user.id === testUser1.id
      );
      expect(foundUser1).toBeDefined();
      expect(foundUser1.email).toEqual(testUser1.email);
    });
  });

  // --- Messaging Tests ---
  describe("Messaging", () => {
    test("POST /messages - should send a message to one or more recipients", async () => {
      const res = await request(server)
        .post("/messages")
        .send({
          senderId: testUser1.id,
          recipientIds: [testUser2.id, testUser3.id],
          subject: "New Test Message",
          content: "This is a brand new message for testing.",
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty("message", "Message sent successfully");
      expect(res.body.sentMessage).toHaveProperty("id");
      expect(res.body.sentMessage.senderId).toEqual(testUser1.id);
      expect(res.body.sentMessage.recipients).toEqual(
        expect.arrayContaining([testUser2.id, testUser3.id])
      );
      expect(res.body.sentMessage.subject).toEqual("New Test Message");
      expect(res.body.sentMessage.content).toEqual(
        "This is a brand new message for testing."
      );
    });

    test("GET /users/:id/sent-messages - should retrieve sent messages for a specific user", async () => {
      const res = await request(server).get(
        `/users/${testUser1.id}/sent-messages`
      );

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("sentMessages");
      expect(Array.isArray(res.body.sentMessages)).toBe(true);
      expect(res.body.sentMessages.length).toBeGreaterThanOrEqual(2); // At least testMessage1 and testMessage2

      const foundMessage1 = res.body.sentMessages.find(
        (msg) => msg.id === testMessage1.id
      );
      expect(foundMessage1).toBeDefined();
      expect(foundMessage1.sender.id).toEqual(testUser1.id);
      expect(foundMessage1.recipients).toHaveLength(1); // testMessage1 was sent only to testUser2
      expect(foundMessage1.recipients[0].recipient.id).toEqual(testUser2.id);
    });

    test("GET /users/:id/inbox-messages - should retrieve inbox messages for a specific user", async () => {
      const res = await request(server).get(
        `/users/${testUser2.id}/inbox-messages`
      );

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("inboxMessages");
      expect(Array.isArray(res.body.inboxMessages)).toBe(true);
      expect(res.body.inboxMessages.length).toBeGreaterThanOrEqual(1); // At least testMessage1

      const foundInboxMessage = res.body.inboxMessages.find(
        (msg) => msg.messageId === testMessage1.id
      );
      expect(foundInboxMessage).toBeDefined();
      expect(foundInboxMessage.sender.id).toEqual(testUser1.id);
      expect(foundInboxMessage.readStatus.isRead).toBe(false); // Should be unread initially
    });

    test("GET /messages/:id - should view a specific message with all its recipients", async () => {
      const res = await request(server).get(`/messages/${testMessage1.id}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("message");
      expect(res.body.message.id).toEqual(testMessage1.id);
      expect(res.body.message.sender.id).toEqual(testUser1.id);
      expect(res.body.message.recipients).toHaveLength(1); // testMessage1 was sent only to testUser2
      expect(res.body.message.recipients[0].recipient.id).toEqual(testUser2.id);
      expect(res.body.message.recipients[0].read).toBe(false);
    });
  });

  // --- Read Status Tests ---
  describe("Read Status", () => {
    test("PATCH /message-recipients/:id/mark-read - should mark a message as read", async () => {
      // Ensure testMessageRecipient1 is defined and initially unread
      expect(testMessageRecipient1).toBeDefined();
      expect(testMessageRecipient1.read).toBe(false);

      const res = await request(server).patch(
        `/messages/message-recipients/${testMessageRecipient1.id}/mark-read`
      );

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty(
        "message",
        "Message marked as read successfully."
      );
      expect(res.body.messageRecipient.id).toEqual(testMessageRecipient1.id);
      expect(res.body.messageRecipient.read).toBe(true);
      expect(res.body.messageRecipient.readAt).not.toBeNull();

      // Verify in the database as well
      const updatedRecipient = await MessageRecipient.findByPk(
        testMessageRecipient1.id
      );
      expect(updatedRecipient.read).toBe(true);
      expect(updatedRecipient.readAt).not.toBeNull();
    });

    test("GET /users/:id/inbox-messages?read=false - should retrieve unread messages for a specific user", async () => {
      // Send another unread message to testUser2
      await request(server)
        .post("/messages")
        .send({
          senderId: testUser1.id,
          recipientIds: [testUser2.id],
          subject: "Unread Message Test",
          content: "This message should appear as unread.",
        });

      const res = await request(server).get(
        `/users/${testUser2.id}/inbox-messages?read=false`
      );

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("inboxMessages");
      expect(Array.isArray(res.body.inboxMessages)).toBe(true);

      // We expect at least one unread message (the one just sent)
      // The previously marked message (testMessage1) should NOT be here
      const unreadMessages = res.body.inboxMessages.filter(
        (msg) => !msg.readStatus.isRead
      );
      expect(unreadMessages.length).toBeGreaterThanOrEqual(1);

      // Verify that the previously marked message is NOT in the unread list
      const markedReadMessage = res.body.inboxMessages.find(
        (msg) => msg.messageId === testMessage1.id
      );
      expect(markedReadMessage).toBeUndefined(); // It should not be in the unread list
    });

    test("GET /users/:id/inbox-messages?read=true - should retrieve read messages for a specific user", async () => {
      const res = await request(server).get(
        `/users/${testUser2.id}/inbox-messages?read=true`
      );

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("inboxMessages");
      expect(Array.isArray(res.body.inboxMessages)).toBe(true);

      // We expect at least testMessage1 to be here, as it was marked read
      const readMessages = res.body.inboxMessages.filter(
        (msg) => msg.readStatus.isRead
      );
      expect(readMessages.length).toBeGreaterThanOrEqual(1);

      const foundReadMessage = readMessages.find(
        (msg) => msg.messageId === testMessage1.id
      );
      expect(foundReadMessage).toBeDefined();
      expect(foundReadMessage.readStatus.isRead).toBe(true);
      expect(foundReadMessage.readStatus.readAt).not.toBeNull();
    });
  });
});

describe("User Controller Error Handling", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should return 500 if creating a user fails", async () => {
    jest.spyOn(User, "create").mockImplementationOnce(() => {
      throw new Error("User creation failed");
    });

    const res = await request(server)
      .post("/users")
      .send({ email: "fail@example.com", name: "Fail" });

    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty(
      "error",
      "Internal server error during user creation."
    );
  });

  test("should return 500 if finding a user by pk fails", async () => {
    jest.spyOn(User, "findByPk").mockImplementationOnce(() => {
      throw new Error("FindByPk failed");
    });

    const res = await request(server).get(`/users/${testUser1.id}`);

    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty(
      "error",
      "Internal server error during user retrieval."
    );
  });

  test("should return 500 if finding all users fails", async () => {
    jest.spyOn(User, "findAll").mockImplementationOnce(() => {
      throw new Error("FindAll failed");
    });

    const res = await request(server).get("/users");

    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty(
      "error",
      "Internal server error during user listing."
    );
  });

  test("should return 500 if finding sent messages fails", async () => {
    jest.spyOn(Message, "findAll").mockImplementationOnce(() => {
      throw new Error("FindAll failed");
    });

    const res = await request(server).get(
      `/users/${testUser1.id}/sent-messages`
    );

    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty(
      "error",
      "Internal server error during sent messages retrieval."
    );
  });

  test("should return 500 if finding inbox messages fails", async () => {
    jest.spyOn(MessageRecipient, "findAll").mockImplementationOnce(() => {
      throw new Error("FindAll failed");
    });

    const res = await request(server).get(
      `/users/${testUser2.id}/inbox-messages`
    );

    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty(
      "error",
      "Internal server error during inbox messages retrieval."
    );
  });

  test("should return 404 if user not found for sent messages", async () => {
    const nonExistentId = "a0a0a0a0-a0a0-4a0a-a0a0-a0a0a0a0a0a0";
    const res = await request(server).get(
      `/users/${nonExistentId}/sent-messages`
    );
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty("error", "User not found.");
  });

  test("should return 404 if user not found for inbox messages", async () => {
    const nonExistentId = "a0a0a0a0-a0a0-4a0a-a0a0-a0a0a0a0a0a0";
    const res = await request(server).get(
      `/users/${nonExistentId}/inbox-messages`
    );
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty("error", "User not found.");
  });
});
