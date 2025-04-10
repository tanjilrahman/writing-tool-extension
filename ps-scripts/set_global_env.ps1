# Default values
$CLI_CEB_DEV = "false"
$CLI_CEB_FIREFOX = "false"
$cli_values = @()

# Parse arguments
foreach ($arg in $args) {
    $key, $value = $arg -split '='
    
    if ($key -eq "CLI_CEB_DEV") {
        $CLI_CEB_DEV = $value
    }
    elseif ($key -eq "CLI_CEB_FIREFOX") {
        $CLI_CEB_FIREFOX = $value
    }
    else {
        $cli_values += "$key=$value"
    }
}

# Create new file content
$newContent = @"
# THOSE VALUES ARE EDITABLE ONLY VIA CLI
CLI_CEB_DEV=$CLI_CEB_DEV
CLI_CEB_FIREFOX=$CLI_CEB_FIREFOX
$($cli_values -join "`n")

# THOSE VALUES ARE EDITABLE
"@

# Get existing editable values
if (Test-Path .env) {
    $editableValues = Get-Content .env | Where-Object { $_ -match '^CEB_|^GEMINI_API_KEY=' }
    if ($editableValues) {
        $newContent += "`n" + ($editableValues -join "`n")
    }
}

# Write to .env file
$newContent | Set-Content .env -NoNewline 