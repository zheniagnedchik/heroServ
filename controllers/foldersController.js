const { DocumentStore } = require("ravendb");
const bcrypt = require("bcrypt");
const jwt = require("node-jsonwebtoken");
const User = require("../models/user");
const ffmpeg = require("fluent-ffmpeg");
const multer = require("multer");
const store = new DocumentStore("http://64.226.88.96:8080", "Folders");

store.initialize();
const Shop = require("../models/shop");
const Folders = require("../models/folders");

exports.addFolder = async (req, res) => {
  console.log(res);
  try {
    const session = store.openSession();
    const { creator, type, img } = req.body;
    const newPost = new Folders(creator, type, img);

    await session.store(newPost);
    await session.saveChanges();
    res.send("ok");
  } catch (error) {
    res.send({ success: false, message: error.message });
  }
};

exports.getFolders = async (req, res) => {
  const { userId } = req.body;

  try {
    const session = store.openSession();

    // Подразумевается, что у вас есть индекс, индексирующий документы пользователей по Id
    const folders = await session
      .query({ collection: "Folders" })
      .whereEquals("creator", userId)
      .all();

    res.json(folders);
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
