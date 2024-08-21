const  { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'postgres',
  });

  sequelize.sync({ alter: true });

  const User = sequelize.define('user', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    username: DataTypes.STRING,
    order_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'order',
            key: 'id'
        },
    },
    password: DataTypes.STRING,
    codeExpiresOn: DataTypes.DATE,
    create_timestamp: {
        type: DataTypes.DATE,
    },
    update_timestamp: {
        type: DataTypes.DATE,
    }
},{
    tableName: 'user', // Explicitly specify the table name
});

const Product = sequelize.define('product', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
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
},{
    tableName: 'product', // Explicitly specify the table name
});

const Order = sequelize.define('order', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
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
},{
    tableName: 'order', // Explicitly specify the table name
});


const connect = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

module.exports = {  sequelize, User, Product, Order, connect };

