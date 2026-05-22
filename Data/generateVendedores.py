import pandas as pd

# =====================================================================
# CONFIGURACIÓN
# =====================================================================
archivo_excel = "clientes.xlsx"  # Nombre de tu archivo Excel
archivo_salida_sql = "inserts_vendedores.sql"  # Archivo SQL que se generará
nombre_tabla = "vendedores"

try:
    # 1. Leer el archivo Excel
    print(f"📖 Leyendo el archivo {archivo_excel}...")
    df = pd.read_excel(archivo_excel, sheet_name="Vendedores")

    # 2. Validar que existan las columnas exactas
    columnas_requeridas = ["CODIGO", "APELLIDOS Y NOMBRES DEL VENDEDOR"]
    for col in columnas_requeridas:
        if col not in df.columns:
            raise ValueError(f"❌ No se encontró la columna requerida: '{col}'")

    # 3. Limpieza básica de datos (quitar espacios en blanco al inicio/final)
    df["CODIGO"] = df["CODIGO"].astype(str).str.strip()
    df["APELLIDOS Y NOMBRES DEL VENDEDOR"] = (
        df["APELLIDOS Y NOMBRES DEL VENDEDOR"].astype(str).str.strip()
    )

    # Eliminar filas donde el código o el nombre estén completamente vacíos
    df = df[
        (df["CODIGO"] != "")
        & (df["APELLIDOS Y NOMBRES DEL VENDEDOR"] != "")
        & (df["CODIGO"] != "nan")
        & (df["APELLIDOS Y NOMBRES DEL VENDEDOR"] != "nan")
    ]

    # 4. Generar los INSERTS con ON CONFLICT (para evitar errores por duplicados globales)
    print("⚡ Generando sentencias SQL...")
    lineas_sql = []

    for index, fila in df.iterrows():
        codigo = fila["CODIGO"]
        # Reemplazar comillas simples (') por doble comilla simple ('') para evitar errores de sintaxis en SQL
        nombre = fila["APELLIDOS Y NOMBRES DEL VENDEDOR"].replace("'", "''")

        # Construimos el INSERT usando la sintaxis exacta de tu DB global
        insert_statement = (
            f"INSERT INTO {nombre_tabla} (codigo, nombre) "
            f"VALUES ('{codigo}', '{nombre}') "
            f"ON CONFLICT (codigo) DO NOTHING;\n"
        )
        lineas_sql.append(insert_statement)

    # 5. Guardar en el archivo de salida
    with open(archivo_salida_sql, "w", encoding="utf-8") as f:
        f.writelines(lineas_sql)

    print(
        f"✅ ¡Proceso completado con éxito! Se han generado {len(lineas_sql)} INSERTS."
    )
    print(f"📂 Archivo guardado como: '{archivo_salida_sql}'")

except FileNotFoundError:
    print(
        f"❌ Error: El archivo '{archivo_excel}' no existe en esta carpeta."
    )
except Exception as e:
    print(f"❌ Ocurrió un error inesperado: {e}")