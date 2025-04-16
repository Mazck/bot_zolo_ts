-- Tạo bảng người dùng (Users)
CREATE TABLE Users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    nickname VARCHAR(100),
    avatarUrl VARCHAR(255),
    level INT DEFAULT 1,
    exp INT DEFAULT 0,
    messageCount INT DEFAULT 0,
    money DECIMAL(15, 2) DEFAULT 0,
    isBanned BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo bảng nhóm (Groups)
CREATE TABLE Groups (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    memberCount INT DEFAULT 0,
    avatarUrl VARCHAR(255),
    level INT DEFAULT 1,
    tier VARCHAR(50),
    messageCount INT DEFAULT 0,
    isActive BOOLEAN DEFAULT TRUE,
    activationDate TIMESTAMP,
    expirationDate TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo bảng quan hệ giữa người dùng và nhóm (UserGroups)
CREATE TABLE UserGroups (
    userId VARCHAR(36),
    groupId VARCHAR(36),
    role VARCHAR(50) DEFAULT 'member',
    joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (userId, groupId),
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (groupId) REFERENCES Groups(id) ON DELETE CASCADE
);
