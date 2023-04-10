"use strict";

const mongoose = require("mongoose");

mongoose.connect(process.env.DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const messageSchema = new mongoose.Schema({
  board: String,
  text: String,
  delete_password: String,
  created_on: Date,
  bumped_on: Date,
  reported: {
    type: Boolean,
    default: false,
  },
  replies: {
    type: Array,
    default: [],
  },
});

const Message = mongoose.model("Message", messageSchema);

module.exports = function (app) {
  app
    .route("/api/threads/:board")
    .get(async (req, res) => {
      const { board } = req.params;
      const boardMessages = await Message.find({ board });
      boardMessages.sort((a, b) => {
        if (a.bumped_on > b.bumped_on) return -1;
        if (a.bumped_on < b.bumped_on) return 1;
        return 0;
      });
      const trimmedMessages =
        boardMessages.length <= 10
          ? boardMessages.slice()
          : boardMessages.slice(0, 10);
      trimmedMessages.forEach((message) => {
        message.reported = undefined;
        message.delete_password = undefined;
        if (message.replies.length > 3) {
          message.replies = message.replies.slice(-3);
        }
        message.replies.forEach((reply) => {
          delete reply.reported;
          delete reply.delete_password;
        });
      });
      res.send(trimmedMessages);
    })
    .post(async (req, res) => {
      const { board } = req.params;
      const { text, delete_password } = req.body;
      const now = new Date();
      const newMessageData = {
        board,
        text,
        delete_password,
        created_on: now,
        bumped_on: now,
      };
      const newMessage = await new Message(newMessageData).save();
      res.send(newMessage);
    })
    .put(async (req, res) => {
      const { thread_id } = req.body;
      const updatedMessage = await Message.findByIdAndUpdate(thread_id, {
        reported: true,
      });
      res.send("reported");
    })
    .delete(async (req, res) => {
      const { thread_id, delete_password } = req.body;
      const toDelete = await Message.findById(thread_id);
      if (toDelete) {
        if (toDelete.delete_password != delete_password)
          return res.send("incorrect password");
        const deletedMessage = await Message.findByIdAndDelete(thread_id);
      }
      res.send("success");
    });

  app
    .route("/api/replies/:board")
    .get(async (req, res) => {
      const { thread_id } = req.query;
      const thread = await Message.findById(thread_id);
      thread.delete_password = undefined;
      thread.reported = undefined;
      thread.replies.forEach((reply) => {
        delete reply.reported;
        delete reply.delete_password;
      });
      res.send(thread);
    })
    .post(async (req, res) => {
      const { text, delete_password, thread_id } = req.body;
      const messageToEdit = await Message.findById(thread_id);
      const now = new Date();
      const newReplyObj = {
        _id: messageToEdit.replies.length + 1,
        text,
        delete_password,
        created_on: now,
        reported: false,
      };
      messageToEdit.replies.push(newReplyObj);
      const editedMessage = await Message.findByIdAndUpdate(
        thread_id,
        {
          replies: messageToEdit.replies,
          bumped_on: now,
        },
        { new: true }
      );
      res.send(editedMessage);
    })
    .put(async (req, res) => {
      const { thread_id, reply_id } = req.body;
      const message = await Message.findById(thread_id);
      message.replies.forEach(async (reply) => {
        if (reply._id == reply_id) {
          reply.reported = true;
          const updatedMessage = await Message.findByIdAndUpdate(thread_id, {
            replies: message.replies,
          });
          res.send("reported");
        }
      });
    })
    .delete(async (req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;
      const message = await Message.findById(thread_id);
      message.replies.forEach(async (reply) => {
        if (reply._id == reply_id) {
          if (delete_password != reply.delete_password)
            return res.send("incorrect password");
          reply.text = "[deleted]";
          const updatedThread = await Message.findByIdAndUpdate(thread_id, {
            replies: message.replies,
          });
          res.send("success");
        }
      });
    });
};
