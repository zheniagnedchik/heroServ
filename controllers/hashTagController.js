const { DocumentStore } = require("ravendb");
const bcrypt = require("bcrypt");
const jwt = require("node-jsonwebtoken");
const User = require("../models/user");
const ffmpeg = require("fluent-ffmpeg");
const multer = require("multer");
const store = new DocumentStore("http://64.226.88.96:8080", "HashTags");

store.initialize();
const Shop = require("../models/shop");
const Folders = require("../models/folders");
const HashTag = require("../models/hashTag");

exports.addHAshTag = async (req, res) => {
  console.log(res);
  try {
    const session = store.openSession();
    const { creator, type, clients, title } = req.body;
    const existingHashTag = await session
      .query({ collection: "HashTags" })
      .whereEquals("creator", creator)
      .whereEquals("title", title)
      .all();
    if (existingHashTag.length !== 0) {
      existingHashTag[0].clients.push(...clients);
      await session.store(newPost);
      res.send(existingHashTag);
    } else {
      const newPost = new HashTag(creator, type, clients, title);
      await session.store(newPost);
      await session.saveChanges();
      res.send(newPost);
    }
  } catch (error) {
    res.send({ success: false, message: error.message });
  }
};
exports.getClients = async (req, res) => {
  const session = store.openSession();
  const { creator } = req.body;
  try {
    // Запрос к базе данных
    const results = await session
      .query({ collection: "HashTags" })
      .whereEquals("creator", creator)
      .all();
    // const all = results.map((item) => item.ids).flat();
    // Извлечение и возвращение массива ids
    res.send(results);
  } catch (e) {
    res.send(e);
  }
};
// exports.addHashTag = async (req, res) => {
//   console.log(res);
//   try {
//     const session = store.openSession();
//     const { creator, type, clients, title } = req.body;

//     // Поиск существующего хэштега по creatorId и title
//     const existingHashTag = await session
//       .query({ collection: "HashTags" })
//       .whereEquals("creator", creator)
//       .whereEquals("title", title)
//       .firstOrDefault();

//     if (existingHashTag) {
//       // Если хэштег найден, обновляем поле clients
//       existingHashTag.clients.push(...clients);
//       await session.store(newPost);
//       res.send(newPost);
//     } else {
//       const newPost = new HashTag(creator, type, clients, title);
//       await session.store(newPost);
//       await session.saveChanges();
//       res.send(newPost);
//     }
//   } catch (error) {
//     res.send({ success: false, message: error.message });
//   }
// };

exports.getHashTags = async (req, res) => {
  try {
    const session = store.openSession();
    const { userId } = req.body;
    let results = await session
      .query({ collection: "HashTags" })
      .whereEquals("creator", userId)
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
    const index = trainings.ids.findIndex((el) => el === progId);
    trainings.ids.splice(index, 1);
    await session.saveChanges();
    res.send("ok");
  } catch (err) {
    res.status(500).json({ error: "An error occurred" });
  }
};
exports.delChatFolder = async (req, res) => {
  const { id } = req.body;
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
    res.status(500).send("Internal Server Error");
  }
};
