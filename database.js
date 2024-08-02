const  { Sequelize, DataTypes } = require("sequelize");

// const sequelize = new Sequelize('sqlite::memory:');
console.log({
    DB_NAME: process.env.DB_NAME,
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_HOST: process.env.DB_HOST
});
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'postgres',
  });

  const User = sequelize.define('user', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    username: DataTypes.STRING,
    order_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'order',
            key: 'id'
        },
    },
    create_timestamp: {
        type: DataTypes.DATE,
    },
    update_timestamp: {
        type: DataTypes.DATE,
    }
});

const Product = sequelize.define('product', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    description: DataTypes.STRING, 
    create_timestamp: {
        type: DataTypes.DATE,
    },
    update_timestamp: {
        type: DataTypes.DATE,
    }
});

const Order = sequelize.define('order', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    order_id: DataTypes.UUID,
    product_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'product',
            key: 'id'
        },
    },
    create_timestamp: {
        type: DataTypes.DATE,
    },
    update_timestamp: {
        type: DataTypes.DATE,
    }
});


const connect = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

module.exports = { connect };

