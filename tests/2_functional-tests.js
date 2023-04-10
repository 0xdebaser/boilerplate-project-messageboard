const chaiHttp = require("chai-http");
const chai = require("chai");
const assert = chai.assert;
const server = require("../server");

chai.use(chaiHttp);

suite("Functional Tests", function () {
  const thread_URL = "/api/threads/test";
  const replies_URL = "/api/replies/test";

  test("Creating a new thread: POST request to /api/threads/{board}", async () => {
    const res = await chai.request(server).post(thread_URL).send({
      text: "Text from automated test.",
      delete_password: "delete",
    });
    const data = res.body;
    assert.equal(res.status, 200);
    assert.isObject(data);
    assert.hasAllKeys(data, [
      "board",
      "text",
      "delete_password",
      "created_on",
      "bumped_on",
      "reported",
      "replies",
      "_id",
      "__v",
    ]);
    assert.isNotNull(data._id);
    assert.equal(
      new Date(data.created_on).toDateString(),
      new Date().toDateString()
    );
    assert.equal(data.text, "Text from automated test.");
    assert.equal(data.delete_password, "delete");
    assert.equal(data.created_on, data.bumped_on);
    assert.isArray(data.replies);
    assert.isFalse(data.reported);
  });

  test("Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}", async () => {
    const res = await chai.request(server).get(thread_URL);
    const data = res.body;
    assert.equal(res.status, 200);
    assert.isArray(data);
    assert.isAtMost(data.length, 10);
    data.forEach((thread) => {
      assert.doesNotHaveAllKeys(thread, ["delete_password", "reported"]);
      assert.isAtMost(thread.replies.length, 3);
      thread.replies.forEach((reply) => {
        assert.doesNotHaveAllKeys(reply, ["delete_password", "reported"]);
      });
    });
    assert.isAtMost(
      new Date(data[data.length - 1].bumped_on),
      new Date(data[0].bumped_on)
    );
  });

  test("Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password", async () => {
    let res = await chai.request(server).get(thread_URL);
    let data = res.body;
    const testIdToDelete = data[data.length - 1]._id;

    res = await chai
      .request(server)
      .delete(thread_URL)
      .send({ thread_id: testIdToDelete, delete_password: "wrong password" });
    assert.equal(res.status, 200);
    assert.equal(res.text, "incorrect password");
  });

  test("Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password", async () => {
    let res = await chai.request(server).post(thread_URL).send({
      text: "Text from automated test.",
      delete_password: "delete",
    });
    let data = res.body;
    const testIdToDelete = data._id;

    res = await chai
      .request(server)
      .delete(thread_URL)
      .send({ thread_id: testIdToDelete, delete_password: "delete" });
    assert.equal(res.status, 200);
    assert.equal(res.text, "success");
  });

  test("Reporting a thread: PUT request to /api/threads/{board}", async () => {
    let res = await chai.request(server).post(thread_URL).send({
      text: "Text from automated test.",
      delete_password: "delete",
    });
    let data = res.body;
    const testId = data._id;

    res = await chai
      .request(server)
      .put(thread_URL)
      .send({ thread_id: testId });
    assert.equal(res.status, 200);
    assert.equal(res.text, "reported");
  });

  test("Creating a new reply: POST request to /api/replies/{board}", async () => {
    let res = await chai.request(server).get(thread_URL);
    let data = res.body;
    const testId = data[data.length - 1]._id;

    res = await chai.request(server).post(replies_URL).send({
      text: "Reply text from automated test.",
      delete_password: "delete",
      // Come back and automate this!
      thread_id: testId,
    });
    data = res.body;
    assert.equal(res.status, 200);
    assert.isObject(data);
    assert.hasAllKeys(data, [
      "board",
      "text",
      "delete_password",
      "created_on",
      "bumped_on",
      "reported",
      "replies",
      "_id",
      "__v",
    ]);
    assert.isArray(data.replies);
    assert.isAbove(data.replies.length, 0);
    assert.hasAllKeys(data.replies[data.replies.length - 1], [
      "_id",
      "text",
      "created_on",
      "delete_password",
      "reported",
    ]);
    assert.equal(
      data.replies[data.replies.length - 1].text,
      "Reply text from automated test."
    );
    assert.equal(data.delete_password, "delete");
    assert.notEqual(data.created_on, data.bumped_on);
  });

  test("Viewing a single thread with all replies: GET request to /api/replies/{board}", async () => {
    let res = await chai.request(server).get(thread_URL);
    let data = res.body;
    const testId = data[data.length - 1]._id;

    res = await chai.request(server).get(`${replies_URL}?thread_id=${testId}`);
    data = res.body;
    assert.equal(res.status, 200);
    assert.isObject(data);
    assert.isArray(data.replies);
    assert.doesNotHaveAllDeepKeys(data, ["delete_password", "reported"]);
  });

  test("Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password", async () => {
    let res = await chai.request(server).post(thread_URL).send({
      text: "Text from automated test.",
      delete_password: "delete",
    });
    let data = res.body;
    const testThreadId = data._id;

    res = await chai.request(server).post(replies_URL).send({
      thread_id: testThreadId,
      text: "test reply text",
      delete_password: "delete",
    });
    data = res.body;
    replyIdToDelete = data.replies[data.replies.length - 1]._id;

    res = await chai
      .request(server)
      .delete(thread_URL)
      .send({ thread_id: testThreadId, delete_password: "wrong password" });
    assert.equal(res.status, 200);
    assert.equal(res.text, "incorrect password");
  });

  test("Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password", async () => {
    let res = await chai.request(server).post(thread_URL).send({
      text: "Text from automated test.",
      delete_password: "delete",
    });
    let data = res.body;
    const testThreadId = data._id;

    res = await chai.request(server).post(replies_URL).send({
      thread_id: testThreadId,
      text: "test reply text",
      delete_password: "delete",
    });
    data = res.body;
    replyIdToDelete = data.replies[data.replies.length - 1]._id;

    res = await chai.request(server).delete(replies_URL).send({
      thread_id: testThreadId,
      delete_password: "delete",
      reply_id: replyIdToDelete,
    });
    assert.equal(res.status, 200);
    assert.equal(res.text, "success");
  });

  test("Reporting a reply: PUT request to /api/replies/{board}", async () => {
    let res = await chai.request(server).post(thread_URL).send({
      text: "Text from automated test.",
      delete_password: "delete",
    });
    let data = res.body;
    const testThreadId = data._id;

    res = await chai.request(server).post(replies_URL).send({
      thread_id: testThreadId,
      text: "test reply text",
      delete_password: "delete",
    });
    data = res.body;
    testReplyId = data.replies[data.replies.length - 1]._id;

    res = await chai
      .request(server)
      .put(replies_URL)
      .send({ thread_id: testThreadId, reply_id: testReplyId });
    assert.equal(res.status, 200);
    assert.equal(res.text, "reported");
  });
  after(function () {
    chai.request(server).get("/");
  });
});
