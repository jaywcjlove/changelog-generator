declare type Commits = {
  "sha": string;
  "commit": {
    "author": {
      "name": string;
      "email": string;
      "date": string;
    },
    "committer": {
      "name": string;
      "email": string;
      "date": string;
    },
    "message": string;
    "tree": {
      "sha": string;
      "url": string;
    },
    "url": string;
    "comment_count": number,
    "verification": {
      "verified": true,
      "reason": string;
      "signature": string;
      "payload": string;
    }
  },
  author: {
    login?: string;
    email: string;
    name: string;
    username: string;
  },
  committer: {
    email: string;
    name: string;
    username: string;
  },
  distinct: boolean,
  id: string;
  message: string;
  timestamp: string;
  tree_id: string;
  url: string;
}

declare type CommitsData = {
  url: string;
  sha: string;
  node_id: string;
  commit: any;
  commits: Array<Commits>;
}