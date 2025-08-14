import pandas as pd
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASS', 'root'),
    'database': os.getenv('DB_NAME', 'atree_content')
}

def create_database_if_not_exists():
    try:
        # Connect without database selected
        conn = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password']
        )
        cursor = conn.cursor()
        
        # Create database if it doesn't exist
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']}")
        
        cursor.close()
        conn.close()
        
    except Error as e:
        print(f"Error creating database: {e}")
        raise

def create_table_if_not_exists(conn):
    try:
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        create_table_query = """
        CREATE TABLE IF NOT EXISTS migrated_content1 (
            id INT NOT NULL AUTO_INCREMENT,
            domain VARCHAR(255),
            sub_domain VARCHAR(255),
            content_language VARCHAR(100),
            primary_user TEXT,
            target_age_group VARCHAR(255),
            program VARCHAR(255),
            author VARCHAR(255),
            copyright VARCHAR(255),
            copyright_year INT,
            subjects TEXT,
            course_title TEXT,
            course_keywords TEXT,
            course_description TEXT,
            set1 VARCHAR(255),
            set1_desc TEXT,
            set2 VARCHAR(255),
            set2_desc TEXT,
            set3 VARCHAR(255),
            set3_desc TEXT,
            set4 VARCHAR(500),
            set4_desc TEXT,
            set5 VARCHAR(500),
            set5_desc TEXT,
            cont_title TEXT,
            cont_engtitle TEXT,
            resource_desc TEXT,
            cont_url TEXT,
            cont_dwurl TEXT,
            type VARCHAR(255),
            migrated INT DEFAULT 0,
            do_id VARCHAR(1000),
            content_do_id VARCHAR(1000),
            convertedFileflag TINYINT NOT NULL DEFAULT 0,
            convertedUrl TEXT,
            old_system_content_id VARCHAR(500),
            comments VARCHAR(500),
            PRIMARY KEY (id)
        )
        """
        cursor.execute(create_table_query)
        conn.commit()
        
        cursor.close()
        
    except Error as e:
        print(f"Error creating table: {e}")
        raise

def import_csv_to_mysql(csv_path):
    try:
        # Create database if it doesn't exist
        create_database_if_not_exists()
        
        # Connect to the database
        conn = mysql.connector.connect(**DB_CONFIG)
        
        # Create table if it doesn't exist
        create_table_if_not_exists(conn)
        
        # Read CSV file
        df = pd.read_csv(csv_path)
        
        # Prepare data for insertion
        columns = df.columns.tolist()
        values = df.values.tolist()
        
        # Create the INSERT query
        placeholders = ', '.join(['%s'] * len(columns))
        columns_str = ', '.join(columns)
        insert_query = f"INSERT INTO migrated_content1 ({columns_str}) VALUES ({placeholders})"
        
        # Execute insert for each row
        cursor = conn.cursor()
        cursor.executemany(insert_query, values)
        conn.commit()
        
        print(f"Successfully imported {len(values)} records")
        
        cursor.close()
        conn.close()
        
    except Error as e:
        print(f"Error: {e}")
        raise
    except Exception as e:
        print(f"Error: {e}")
        raise

if __name__ == "__main__":
    csv_path = os.path.join(os.getcwd(), 'temp', 'content.csv')
    import_csv_to_mysql(csv_path) 