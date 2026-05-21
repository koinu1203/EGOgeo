import pandas as pd
import math
from pathlib import Path

# File configuration
BASE_DIR = Path(__file__).resolve().parent
EXCEL_FILE = BASE_DIR / 'clientes.xlsx'  # Change this to the actual Excel filename
SQL_OUTPUT_FILE = BASE_DIR / 'importar_clientes.sql'

def generate_sql_from_excel():
    try:
        # 1. Read the Excel file (requires: pip install openpyxl pandas)
        df = pd.read_excel(EXCEL_FILE)
        
        print(f"File loaded successfully. Processing {len(df)} records...")
        
        with open(SQL_OUTPUT_FILE, 'w', encoding='utf-8') as f:
            # SQL header to speed up bulk insert operations
            f.write("-- Optimized bulk import script\n")
            f.write("BEGIN;\n\n")
            f.write("ALTER TABLE clientes_ubicacion DISABLE TRIGGER ALL;\n\n")
            
            # Process row by row
            for index, row in df.iterrows():
                cliente_id = str(row['Cliente']).strip().replace("'", "''")
                nombre = str(row['Nombre_del_cliente']).replace("'", "''") # Escape single quotes
                
                # Format date field
                if isinstance(row['Ultima_fecha_de_compra'], pd.Timestamp):
                    ultima_compra = row['Ultima_fecha_de_compra'].strftime('%Y-%m-%d')
                else:
                    ultima_compra = str(row['Ultima_fecha_de_compra'])
                
                monto_anual = float(row['Monto_Compra_anual'])
                moneda = str(row['Moneda']).strip()[:3]
                longitud = float(row['Longitud'])
                latitud = float(row['Latitud'])
                
                # Validate non-null coordinates
                if math.isnan(longitud) or math.isnan(latitud):
                    print(f"Skipping record {cliente_id} due to empty coordinates.")
                    continue
                
                # Build INSERT using ST_SetSRID and ST_MakePoint (Longitude, Latitude)
                sql_line = (
                    f"INSERT INTO clientes_ubicacion (cliente_id, nombre, ultima_compra, monto_anual, moneda, coordenadas) "
                    f"VALUES ('{row['Cliente']}', '{nombre}', '{ultima_compra}', {monto_anual}, '{moneda}', "
                    f"ST_SetSRID(ST_MakePoint({longitud}, {latitud}), 4326));\n"
                )
                f.write(sql_line)
            
            # Re-enable triggers and apply physical ordering (clustering)
            f.write("\nALTER TABLE clientes_ubicacion ENABLE TRIGGER ALL;\n")
            f.write("COMMIT;\n\n")
            f.write("-- Post-import spatial physical optimization\n")
            f.write("CLUSTER clientes_ubicacion USING idx_clientes_coordenadas;\n")
            f.write("ANALYZE clientes_ubicacion;\n")
            
        print(f"Success! SQL file generated at: {SQL_OUTPUT_FILE}")
        print("Next step: Run 'psql -d geodb -f importar_clientes.sql' in your terminal.")

    except FileNotFoundError:
        print(f"Error: File '{EXCEL_FILE}' was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    generate_sql_from_excel()