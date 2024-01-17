const { DocumentStore } = require("ravendb");
const bcrypt = require("bcrypt");
const jwt = require("node-jsonwebtoken");
const User = require("../models/user");
const ffmpeg = require("fluent-ffmpeg");
const multer = require("multer");
const store = new DocumentStore("http://64.226.88.96:8080", "ChatFolders");

store.initialize();
const Shop = require("../models/shop");
const Folders = require("../models/folders");
const ChatFolders = require("../models/chatFolders");

exports.addChatFolder = async (req, res) => {
  console.log(res);
  try {
    const session = store.openSession();
    const { creator, type, ids } = req.body;
    const newPost = new ChatFolders(creator, type, ids);

    await session.store(newPost);
    await session.saveChanges();
    res.send("ok");
  } catch (error) {
    res.send({ success: false, message: error.message });
  }
};

exports.getChatFolders = async (req, res) => {
  try {
    const session = store.openSession();
    const { userId} = req.body;
    let results = await session.query({ collection: 'ChatFolders' })
    .whereEquals('creator', userId)
    .all();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
};
exports.changeFolder = async (req, res) => {
  try {
    const session = store.openSession();
    const { id, newId } = req.body;
    const trainings = await session.load(id);
    trainings.ids = [...trainings.ids, newId];
    await session.saveChanges();
    res.send("ok");
  } catch (err) {
    res.status(500).json({ error: "An error occurred" });
  }
};
exports.delProgInFolder = async (req, res) => {
  try {
    const session = store.openSession();
    const { folderId, progId } = req.body;
    const trainings = await session.load(folderId);
    const index = trainings.ids.findIndex(el=>el===progId);
    trainings.ids.splice(index,1)
    await session.saveChanges();
    res.send("ok");
  } catch (err) {
    res.status(500).json({ error: "An error occurred" });
  }
};
exports.delChatFolder = async (req, res) => {
  const {id} = req.body
  let session = store.openSession();

  try {
      // Находим и удаляем документ по ID
      const document = await session.load(id);
      if (document) {
          await session.delete(document);
          await session.saveChanges();
          res.status(200).send(`Document with ID ${id} has been deleted.`);
      } else {
          res.status(404).send(`Document with ID ${id} not found.`);
      }
  } catch (e) {
      console.error(e);
      res.status(500).send('Internal Server Error');
  } 
}