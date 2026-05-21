Get-ChildItem -Path 'e:/arredaV2/src' -Recurse -Include *.tsx,*.ts,*.css |
ForEach-Object {
    $content = Get-Content $_ -Raw
    $new = $content -replace '#ff6b00', '#AE0000' -replace '#ff8c00', '#AE0000' -replace '#e05e00', '#8B0000'
    Set-Content -Path $_ -Value $new -Force
}
