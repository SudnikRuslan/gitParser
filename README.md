
## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

## Description

graphql url: http://localhost:3000/graphql

You can get repositorues by query 

  repositories(token: "your token", page: 1) {
    name
  	size
  	owner
  }

you can get full repo by query

  fullRepository(token: "your token", owner: "owner", repo: "repo") {
    name
  	size
  	owner
    activeWebhooks {
      name
      id
    }
    ymlFileContent
  }

OR as relation

   repositories(token: "your token", page: 1) {
    name
  	size
  	owner
  	fullRepo(token: "your token") {
      name
      size
      owner
      activeWebhooks {
        name
        id
      }
      ymlFileContent
  	}
  }


