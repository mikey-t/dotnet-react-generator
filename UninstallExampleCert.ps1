Get-ChildItem Cert:\\LocalMachine\\Root | Where-Object { $_.Subject -match 'local.example.mikeyt.net' } | Remove-Item