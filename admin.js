
<!-- Subir fotografía del producto -->
<label>Fotografía del Hot Wheels
  <input
    id="pImageFile"
    type="file"
    accept="image/jpeg,image/png,image/webp"
  >
</label>

<p class="muted tiny">
  Selecciona una fotografía desde tu celular o computadora.
</p>

<!-- Campo de imagen que utiliza el sistema actual -->
<label>URL de imagen (opcional)
  <input
    id="pImage"
    type="url"
    placeholder="https://..."
  >
</label>

<!-- Vista previa de la fotografía -->
<img
  id="pImagePreview"
  alt="Vista previa del Hot Wheels"
  style="display:none;width:100%;max-height:220px;object-fit:contain;border-radius:12px;"
>
    
