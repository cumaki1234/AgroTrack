# ============================================================
#  MLP — Regresión sobre Índice de Salud de Plantas (ISP)
#  Tesis de grado — Perceptrón Multicapa (MLPRegressor)
#  v2: Métricas extendidas + Validación Cruzada
# ============================================================

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, KFold, cross_validate
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

print("=" * 60)
print("  MLP — Regresión: Índice de Salud de Plantas (ISP)")
print("  v2: Métricas extendidas + Validación Cruzada (K-Fold)")
print("=" * 60)

# ── PASO 1: Cargar dataset ─────────────────────────────────
df = pd.read_excel(
    r"C:\Users\eduar\Downloads\data_final.xlsx",
    sheet_name="agriculture"
)
print(f"\n[1] Dataset cargado: {df.shape[0]} filas, {df.shape[1]} columnas")

# ── PASO 2: Selección de variables ─────────────────────────
FEATURES = [
    "Temperatura",
    "Humedad",
    "pH_Suelo",
    "Luz_Solar",
    "Precipitacion",
    "Altitud",
    "Tipo_Suelo",
    "Tipo_Irrigacion",
    "Uso_Fertilizantes",
    "Presencia_Plagas_Enfermedades",
    "Tipo_Producto",
]
TARGET = "ISP_Final"

df_model = df[FEATURES + [TARGET]].copy()
print(f"[2] Features: {len(FEATURES)} | Target: {TARGET}")
print(f"    ISP min={df_model[TARGET].min():.3f}  max={df_model[TARGET].max():.3f}  media={df_model[TARGET].mean():.3f}")

# ── PASO 3: Preprocesamiento ───────────────────────────────
CATEGORICAS = [
    "Tipo_Suelo",
    "Tipo_Irrigacion",
    "Uso_Fertilizantes",
    "Presencia_Plagas_Enfermedades",
    "Tipo_Producto",
]
le = LabelEncoder()
for col in CATEGORICAS:
    df_model[col] = le.fit_transform(df_model[col].astype(str).str.strip())

print(f"[3] Preprocesamiento completo")

# ── PASO 4: División entrenamiento / prueba ────────────────
X = df_model[FEATURES].values
y = df_model[TARGET].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print(f"\n[4] División 80/20:")
print(f"    Entrenamiento: {len(X_train)} muestras")
print(f"    Prueba:        {len(X_test)} muestras")

# ── PASO 5: Escalado ──────────────────────────────────────
scaler         = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)
print(f"[5] Escalado StandardScaler aplicado")

# ── PASO 6: Construcción y entrenamiento ──────────────────
mlp = MLPRegressor(
    hidden_layer_sizes=(128, 64, 32),
    activation='relu',
    solver='adam',
    max_iter=500,
    learning_rate_init=0.001,
    early_stopping=True,
    validation_fraction=0.1,
    n_iter_no_change=20,
    random_state=42,
)

print("\n[6] Entrenando MLP Regresor (128 → 64 → 32)...")
mlp.fit(X_train_scaled, y_train)
print(f"    Épocas ejecutadas: {mlp.n_iter_}")
print(f"    Pérdida final:     {mlp.loss_:.6f}")

# ── PASO 7: Evaluación con métricas extendidas ────────────
y_pred = mlp.predict(X_test_scaled)
residuos = y_test - y_pred

r2   = r2_score(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
mse  = mean_squared_error(y_test, y_pred)
mae  = mean_absolute_error(y_test, y_pred)
mape = np.mean(np.abs((y_test - y_pred) / np.clip(y_test, 1e-6, None))) * 100

# Métricas adicionales
ss_res = np.sum(residuos ** 2)
ss_tot = np.sum((y_test - np.mean(y_test)) ** 2)
r2_adj = 1 - (ss_res / ss_tot) * ((len(y_test) - 1) / (len(y_test) - X_test.shape[1] - 1))

# Explained Variance Score
ev_score = 1 - np.var(residuos) / np.var(y_test)

# Max Error
max_err = np.max(np.abs(residuos))

# Pearson correlation entre real y predicho
pearson_r = np.corrcoef(y_test, y_pred)[0, 1]

print(f"\n[7] Métricas de evaluación (conjunto de prueba):")
print(f"    ┌─────────────────────────────────────────────────┐")
print(f"    │  R²:               {r2:.4f}  ({r2*100:.1f}% varianza explicada)")
print(f"    │  R² Ajustado:      {r2_adj:.4f}")
print(f"    │  Pearson r:        {pearson_r:.4f}")
print(f"    ├─────────────────────────────────────────────────┤")
print(f"    │  MSE:              {mse:.6f}")
print(f"    │  RMSE:             {rmse:.4f}  (±{rmse*100:.1f}pp en escala 0–1)")
print(f"    │  MAE:              {mae:.4f}")
print(f"    │  MAPE:             {mape:.2f}%")
print(f"    │  Max Error:        {max_err:.4f}")
print(f"    │  Explained Var:    {ev_score:.4f}")
print(f"    └─────────────────────────────────────────────────┘")

# ── PASO 8: Validación Cruzada K-Fold (k=10) ─────────────
print(f"\n[8] Validación Cruzada K-Fold (k=10)...")
print(f"    (se usa pipeline con escalado para no filtrar información)")

# Pipeline que incluye el scaler para CV correcta
pipeline_cv = Pipeline([
    ('scaler', StandardScaler()),
    ('mlp', MLPRegressor(
        hidden_layer_sizes=(128, 64, 32),
        activation='relu',
        solver='adam',
        max_iter=500,
        learning_rate_init=0.001,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=20,
        random_state=42,
    ))
])

kf = KFold(n_splits=10, shuffle=True, random_state=42)

cv_results = cross_validate(
    pipeline_cv, X, y,
    cv=kf,
    scoring={
        'r2':        'r2',
        'neg_mse':   'neg_mean_squared_error',
        'neg_mae':   'neg_mean_absolute_error',
        'neg_rmse':  'neg_root_mean_squared_error',
    },
    return_train_score=True,
    n_jobs=-1
)

cv_r2_test      = cv_results['test_r2']
cv_rmse_test    = -cv_results['test_neg_rmse']
cv_mae_test     = -cv_results['test_neg_mae']
cv_r2_train     = cv_results['train_r2']

print(f"\n    Resultados por fold (test):")
print(f"    {'Fold':<6} {'R²':>8} {'RMSE':>8} {'MAE':>8}")
print(f"    {'─'*34}")
for i, (r2_f, rmse_f, mae_f) in enumerate(zip(cv_r2_test, cv_rmse_test, cv_mae_test), 1):
    print(f"    {i:<6} {r2_f:>8.4f} {rmse_f:>8.4f} {mae_f:>8.4f}")

print(f"\n    Resumen K-Fold (k=10):")
print(f"    ┌─────────────────────────────────────────────────┐")
print(f"    │  R² Test   media ± std:  {cv_r2_test.mean():.4f} ± {cv_r2_test.std():.4f}")
print(f"    │  R² Train  media ± std:  {cv_r2_train.mean():.4f} ± {cv_r2_train.std():.4f}")
print(f"    │  RMSE      media ± std:  {cv_rmse_test.mean():.4f} ± {cv_rmse_test.std():.4f}")
print(f"    │  MAE       media ± std:  {cv_mae_test.mean():.4f} ± {cv_mae_test.std():.4f}")
print(f"    └─────────────────────────────────────────────────┘")

# Detección de overfitting
diff_r2 = cv_r2_train.mean() - cv_r2_test.mean()
if diff_r2 < 0.02:
    ajuste = "✅ Buen ajuste (sin overfitting aparente)"
elif diff_r2 < 0.05:
    ajuste = "⚠️  Leve overfitting"
else:
    ajuste = "❌ Overfitting significativo"
print(f"    Diferencia R² (train–test): {diff_r2:.4f}  →  {ajuste}")

# ── PASO 9: Visualizaciones ───────────────────────────────
fig, axes = plt.subplots(2, 3, figsize=(18, 10))
fig.suptitle("MLP Regresor — Índice de Salud de Plantas (ISP_Final)",
             fontsize=14, fontweight='bold')

# 1. Real vs Predicho
axes[0, 0].scatter(y_test, y_pred, alpha=0.4, color='steelblue', s=15)
lims = [min(y_test.min(), y_pred.min()) - 0.02,
        max(y_test.max(), y_pred.max()) + 0.02]
axes[0, 0].plot(lims, lims, 'r--', lw=2, label='Predicción perfecta')
axes[0, 0].set_xlim(lims); axes[0, 0].set_ylim(lims)
axes[0, 0].set_xlabel("ISP Real")
axes[0, 0].set_ylabel("ISP Predicho")
axes[0, 0].set_title(f"Real vs Predicho  —  R² = {r2:.4f}")
axes[0, 0].legend(); axes[0, 0].grid(True, alpha=0.3)

# 2. Curva de pérdida
axes[0, 1].plot(mlp.loss_curve_, color='steelblue', linewidth=2, label='Entrenamiento')
if hasattr(mlp, 'validation_scores_') and mlp.validation_scores_ is not None:
    axes[0, 1].plot(mlp.validation_scores_, color='orange', linewidth=2, label='Validación')
axes[0, 1].set_xlabel("Épocas")
axes[0, 1].set_ylabel("Pérdida (MSE)")
axes[0, 1].set_title("Curva de Aprendizaje")
axes[0, 1].legend(); axes[0, 1].grid(True, alpha=0.3)

# 3. Distribución de residuos
axes[0, 2].hist(residuos, bins=50, color='steelblue', edgecolor='white', alpha=0.8)
axes[0, 2].axvline(0, color='red', linestyle='--', lw=2, label='Error = 0')
axes[0, 2].set_xlabel("Residuo (Real − Predicho)")
axes[0, 2].set_ylabel("Frecuencia")
axes[0, 2].set_title("Distribución de Residuos")
axes[0, 2].legend(); axes[0, 2].grid(True, alpha=0.3)

# 4. Residuos vs Predichos
axes[1, 0].scatter(y_pred, residuos, alpha=0.4, color='steelblue', s=15)
axes[1, 0].axhline(0, color='red', linestyle='--', lw=2)
axes[1, 0].set_xlabel("ISP Predicho")
axes[1, 0].set_ylabel("Residuo")
axes[1, 0].set_title("Residuos vs Predichos")
axes[1, 0].grid(True, alpha=0.3)

# 5. R² por fold (K-Fold)
folds = range(1, 11)
axes[1, 1].bar(folds, cv_r2_test, color='steelblue', alpha=0.8, label='R² Test')
axes[1, 1].bar(folds, cv_r2_train, color='orange', alpha=0.4, label='R² Train')
axes[1, 1].axhline(cv_r2_test.mean(), color='blue', linestyle='--', lw=2,
                   label=f'Media test = {cv_r2_test.mean():.4f}')
axes[1, 1].set_xlabel("Fold")
axes[1, 1].set_ylabel("R²")
axes[1, 1].set_title("R² por Fold — Validación Cruzada (k=10)")
axes[1, 1].set_xticks(list(folds))
axes[1, 1].set_ylim([0, 1.05])
axes[1, 1].legend(); axes[1, 1].grid(True, alpha=0.3, axis='y')

# 6. RMSE y MAE por fold
axes[1, 2].plot(folds, cv_rmse_test, marker='o', color='tomato', lw=2, label='RMSE')
axes[1, 2].plot(folds, cv_mae_test,  marker='s', color='steelblue', lw=2, label='MAE')
axes[1, 2].set_xlabel("Fold")
axes[1, 2].set_ylabel("Error")
axes[1, 2].set_title("RMSE y MAE por Fold")
axes[1, 2].set_xticks(list(folds))
axes[1, 2].legend(); axes[1, 2].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig("mlp_regresion_resultados_v2.png", dpi=150, bbox_inches='tight')
print("\n[9] Gráficas guardadas: mlp_regresion_resultados_v2.png")

# ── PASO 10: Resumen ejecutivo ────────────────────────────
print("\n" + "=" * 60)
print("  RESUMEN EJECUTIVO")
print("=" * 60)
print(f"  Modelo:       MLPRegressor (128→64→32, ReLU, Adam)")
print(f"  Dataset:      {len(df)} registros, {len(FEATURES)} features")
print(f"  Target:       ISP_Final (índice de salud 0–1)")
print(f"  Épocas:       {mlp.n_iter_}")
print()
print(f"  ── Evaluación Hold-Out (20%) ──────────────────────")
print(f"  R²:           {r2:.4f}  →  {r2*100:.1f}% varianza explicada")
print(f"  R² Ajustado:  {r2_adj:.4f}")
print(f"  RMSE:         {rmse:.4f}  →  error promedio ±{rmse*100:.1f}pp")
print(f"  MAE:          {mae:.4f}")
print(f"  MAPE:         {mape:.2f}%")
print(f"  Pearson r:    {pearson_r:.4f}")
print(f"  Max Error:    {max_err:.4f}")
print()
print(f"  ── Validación Cruzada K-Fold (k=10) ───────────────")
print(f"  R² media:     {cv_r2_test.mean():.4f} ± {cv_r2_test.std():.4f}")
print(f"  RMSE media:   {cv_rmse_test.mean():.4f} ± {cv_rmse_test.std():.4f}")
print(f"  MAE media:    {cv_mae_test.mean():.4f} ± {cv_mae_test.std():.4f}")
print(f"  {ajuste}")
print("\n✅ Proceso completado exitosamente")