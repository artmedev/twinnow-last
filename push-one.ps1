# Pushes the oldest unpushed commit of main (one per run)
Set-Location $PSScriptRoot
$c = git rev-list --reverse origin/main..main | Select-Object -First 1
if ($c) { git push origin "${c}:refs/heads/main" }
