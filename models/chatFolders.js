class ChatFolders {
    constructor(creator, type,ids, title) {
      this.creator = creator;
      this.ids = ids
      this.type = type;
      this.createdAt=new Date().getTime()
      this.title=title
    }
  }
  module.exports = ChatFolders;
  