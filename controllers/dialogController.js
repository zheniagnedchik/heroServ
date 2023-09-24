const { DocumentStore } = require("ravendb");
const bcrypt = require("bcrypt");
const jwt = require("node-jsonwebtoken");
const User = require("../models/user");
const ffmpeg = require("fluent-ffmpeg");
const multer = require("multer");
const store = new DocumentStore("http://64.226.88.96:8080", "Dialogs");
store.initialize();
const storeUsers = new DocumentStore("http://64.226.88.96:8080", "Users");
storeUsers.initialize();
const fs = require("fs");
const path = require("path");
const Post = require("../models/post");
const URI = "http://64.226.88.96";
const FormData = require("form-data");
const axios = require("axios");
const Dialog = require("../models/dialog");

exports.createDialog = async (req, res) => {
  try {
    const { dialogId, participants } = req.body;
    const session = store.openSession();
    const newDialog = new Dialog(dialogId, participants);
    await session.store(newDialog);
    await session.saveChanges();
    res.status(201).json({
      id: newDialog.id,
    });
  } catch (err) {
    res.status(500).json({ error: err });
  }
};
exports.findDialogs = async (req, res) => {
  try {
    const { userId } = req.body;
    const session = store.openSession();
    const sessionUser = storeUsers.openSession();
    const dialogs = await session
      .query({ collection: "Dialogs" })
      .whereIn("participants", [userId])
      .all();
    const userIds = dialogs.map((item) => {
      const list = item.participants;
      const filter = list.filter((el) => el !== userId);
      return filter[0];
    });
    const users = await sessionUser
      .query({ collection: "Users" })
      .whereIn(
        "id",
        userIds.map((item) => item)
      )
      .all();
    const dialogsUserData = dialogs.map((post) => {
      const list = post.participants;
      const filter = list.filter((el) => el !== userId);
      const user = users.find((u) => u.id === filter[0]);
      return {
        ...post,
        userAvatarUrl: user ? user.avatar : null,
        email: user.email,
        nikName: user.nikName,
        userName: user.userName, // предполагается, что у объекта пользователя есть поле avatarUrl
      };
    });
    res.status(201).json({
      dialogs: dialogsUserData,
    });
  } catch (err) {
    res.status(500).json({ error: err });
  }
};
exports.findDialogById = async (req, res) => {
  const { id } = req.body;
  const session = store.openSession();
  try {
    const dialog = await session.load(id);
    res.status(201).json({
      dialogs: dialog,
    });
  } catch (error) {
    res.status(500).json({ error: err });
  }
};
exports.findDialogsByParticipiant = async (req, res) => {
  const { userId1, userId2 } = req.body;
  const session = store.openSession();
  try {
    const dialogs = await session
      .query({ collection: "Dialogs" })
      .containsAll("participants", [userId1, userId2]) // используйте containsAll для поиска диалогов, в которых участвуют оба пользователя
      .all();

    res.status(201).json({
      dialogs: dialogs,
    });
  } catch (error) {
    res.status(500).json({ error: err });
  }
};
exports.saveMessage = async () => {
  try {
    const { dialogId, dataMessage } = req.body;
    // Находим документ по ID
    const dialog = await session.load(dialogId);

    if (dialog) {
      // Добавляем новое сообщение в массив messages
      dialog.messages.push(dataMessage);
      await session.saveChanges();
    }
  } catch (error) {
    console.error("Error updating document", error);
  }
};
