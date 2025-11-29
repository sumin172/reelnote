# 워크스페이스 캐시 정리 스크립트
# Cursor/VS Code의 워크스페이스별 캐시와 다양한 언어 서버/확장 캐시를 정리합니다.
#
# 사용법:
#   .\scripts\clean-workspace-cache.ps1                    # 현재 프로젝트만 정리
#   .\scripts\clean-workspace-cache.ps1 -AllWorkspaces     # 모든 워크스페이스 정리
#   .\scripts\clean-workspace-cache.ps1 -Interactive       # 대화형 모드

param(
    [switch]$AllWorkspaces,      # 모든 워크스페이스 캐시 정리
    [switch]$Interactive,        # 대화형 모드
    [switch]$SkipBuildCache,     # 프로젝트 빌드 캐시는 건너뛰기
    [switch]$GradleUserCache     # Gradle 사용자 캐시도 정리 (선택사항)
)

Write-Host "🧹 워크스페이스 캐시 정리 시작..." -ForegroundColor Cyan

$cleanedCount = 0
$projectRoot = Split-Path -Parent $PSScriptRoot
$projectName = Split-Path -Leaf $projectRoot

# 현재 워크스페이스 경로 찾기
$currentWorkspacePath = $null
if (Test-Path "$projectRoot\*.code-workspace") {
    $workspaceFile = Get-ChildItem "$projectRoot\*.code-workspace" | Select-Object -First 1
    $currentWorkspacePath = $workspaceFile.FullName
}

# 1. 워크스페이스별 캐시 정리
Write-Host "`n📁 워크스페이스 캐시 정리 중..." -ForegroundColor Yellow
$workspaceStoragePath = "$env:APPDATA\Cursor\User\workspaceStorage"
$workspaceCachesToClean = @()

if (Test-Path $workspaceStoragePath) {
    $workspaceCaches = Get-ChildItem $workspaceStoragePath -Directory -ErrorAction SilentlyContinue
    foreach ($cache in $workspaceCaches) {
        $shouldClean = $false
        $workspaceFile = "$($cache.FullName)\workspace.json"

        if ($AllWorkspaces) {
            $shouldClean = $true
        } elseif (Test-Path $workspaceFile) {
            # workspace.json 파일을 한 번만 읽기
            $workspaceContent = Get-Content $workspaceFile -Raw -ErrorAction SilentlyContinue
            if ($workspaceContent) {
                try {
                    $workspace = $workspaceContent | ConvertFrom-Json -ErrorAction Stop
                    if ($workspace) {
                        # 현재 프로젝트와 관련된 워크스페이스 찾기
                        $folders = if ($workspace.folders) { $workspace.folders } else { @($workspace.folder) }
                        foreach ($folder in $folders) {
                            $folderPath = if ($folder.path) { $folder.path } else { $folder }
                            $folderUri = if ($folder.uri) { $folder.uri } else { $null }

                            # 프로젝트 경로로 매칭 (절대 경로 확인)
                            if ($folderPath -and (Test-Path (Join-Path $projectRoot $folderPath) -ErrorAction SilentlyContinue)) {
                                $shouldClean = $true
                                break
                            }

                            # URI나 경로에 프로젝트 이름 포함 여부 확인
                            if (($folderPath -like "*$projectName*") -or ($folderUri -like "*$projectName*")) {
                                $shouldClean = $true
                                break
                            }

                            # 현재 워크스페이스 파일명으로 매칭
                            if ($currentWorkspacePath -and $folderUri -like "*$([System.IO.Path]::GetFileName($currentWorkspacePath))*") {
                                $shouldClean = $true
                                break
                            }
                        }
                    }
                } catch {
                    # JSON 파싱 실패 시 원본 텍스트로 확인
                    if ($workspaceContent -like "*$projectName*" -or
                        ($currentWorkspacePath -and $workspaceContent -like "*$([System.IO.Path]::GetFileName($currentWorkspacePath))*")) {
                        $shouldClean = $true
                    }
                }
            }

            # state.vscdb 파일도 확인 (JSON 파싱 실패 시 대비)
            if (-not $shouldClean) {
                $stateFile = "$($cache.FullName)\state.vscdb"
                if (Test-Path $stateFile) {
                    $stateContent = Get-Content $stateFile -Raw -ErrorAction SilentlyContinue
                    if ($stateContent -and $stateContent -like "*$projectName*") {
                        $shouldClean = $true
                    }
                }
            }
        }

        if ($shouldClean) {
            $workspaceCachesToClean += $cache
        }
    }
}

if ($Interactive -and $workspaceCachesToClean.Count -gt 0) {
    Write-Host "`n발견된 워크스페이스 캐시:" -ForegroundColor Cyan
    for ($i = 0; $i -lt $workspaceCachesToClean.Count; $i++) {
        Write-Host "  [$i] $($workspaceCachesToClean[$i].Name)" -ForegroundColor White
    }
    $response = Read-Host "`n모두 삭제하시겠습니까? (y/N)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        $workspaceCachesToClean = @()
    }
}

foreach ($cache in $workspaceCachesToClean) {
    Write-Host "  삭제: $($cache.Name)" -ForegroundColor Gray
    Remove-Item -Recurse -Force $cache.FullName -ErrorAction SilentlyContinue
    $cleanedCount++
}

# 2. 언어 서버 및 확장 캐시 정리
Write-Host "`n🔌 언어 서버 및 확장 캐시 정리 중..." -ForegroundColor Yellow
$globalStoragePath = "$env:APPDATA\Cursor\User\globalStorage"
$extensionCaches = @(
    @{ Name = "Java Language Server"; Path = "redhat.java"; Description = "Java/Gradle 프로젝트 분석 캐시" },
    @{ Name = "Kotlin 확장"; Path = "fwcd.kotlin"; Description = "Kotlin 언어 서버 캐시" },
    @{ Name = "TypeScript"; Path = "ms-vscode.vscode-typescript-next"; Description = "TypeScript 언어 서버 캐시" },
    @{ Name = "ESLint"; Path = "dbaeumer.vscode-eslint"; Description = "ESLint 캐시" },
    @{ Name = "Prettier"; Path = "esbenp.prettier-vscode"; Description = "Prettier 캐시" },
    @{ Name = "Nx Console"; Path = "nrwl.angular-console"; Description = "Nx Console 캐시" }
)

$cachesToClean = @()
foreach ($ext in $extensionCaches) {
    $extPath = Join-Path $globalStoragePath $ext.Path
    if (Test-Path $extPath) {
        $cachesToClean += @{
            Name = $ext.Name
            Path = $extPath
            Description = $ext.Description
        }
    }
}

if ($Interactive -and $cachesToClean.Count -gt 0) {
    Write-Host "`n발견된 확장 캐시:" -ForegroundColor Cyan
    for ($i = 0; $i -lt $cachesToClean.Count; $i++) {
        Write-Host "  [$i] $($cachesToClean[$i].Name) - $($cachesToClean[$i].Description)" -ForegroundColor White
    }
    $response = Read-Host "`n모두 삭제하시겠습니까? (y/N)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        $cachesToClean = @()
    }
}

foreach ($cache in $cachesToClean) {
    Write-Host "  삭제: $($cache.Name)" -ForegroundColor Gray
    Remove-Item -Recurse -Force $cache.Path -ErrorAction SilentlyContinue
    $cleanedCount++
}

# 2.5. Nx 프로세스 및 캐시 정리
if (-not $SkipBuildCache) {
    Write-Host "`n⚙️  Nx 프로세스 및 캐시 정리 중..." -ForegroundColor Yellow

    # nxw.js 파일 보호를 위한 백업
    $nxwJsPath = "$projectRoot\.nx\nxw.js"
    $nxwJsBackupPath = "$projectRoot\.nx\nxw.js.backup"
    $nxwJsExists = Test-Path $nxwJsPath

    if ($nxwJsExists) {
        try {
            Copy-Item $nxwJsPath $nxwJsBackupPath -Force -ErrorAction Stop
            Write-Host "  🔒 nxw.js 파일 백업 완료" -ForegroundColor Gray
        } catch {
            Write-Host "  ⚠️  nxw.js 백업 실패: $_" -ForegroundColor Yellow
        }
    }

    # Nx 데몬 종료
    try {
        Write-Host "  Nx 데몬 종료 중..." -ForegroundColor Gray
        Push-Location $projectRoot
        pnpm nx daemon --stop 2>&1 | Out-Null
        Write-Host "  ✅ Nx 데몬 종료 완료" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  Nx 데몬 종료 실패 (이미 종료되었을 수 있음)" -ForegroundColor Yellow
    } finally {
        Pop-Location
    }

    # Nx 캐시 리셋
    try {
        Write-Host "  Nx 캐시 리셋 중..." -ForegroundColor Gray
        Push-Location $projectRoot
        pnpm nx reset 2>&1 | Out-Null
        Write-Host "  ✅ Nx 캐시 리셋 완료" -ForegroundColor Green
        $cleanedCount++
    } catch {
        Write-Host "  ⚠️  Nx 캐시 리셋 실패: $_" -ForegroundColor Yellow
    } finally {
        Pop-Location
    }

    # nxw.js 파일 보호 확인 및 복원
    if ($nxwJsExists) {
        if (-not (Test-Path $nxwJsPath)) {
            Write-Host "  ⚠️  nxw.js 파일이 삭제되었습니다! 복원 중..." -ForegroundColor Red
            if (Test-Path $nxwJsBackupPath) {
                try {
                    Copy-Item $nxwJsBackupPath $nxwJsPath -Force -ErrorAction Stop
                    Write-Host "  ✅ nxw.js 파일 복원 완료" -ForegroundColor Green
                } catch {
                    Write-Host "  ❌ nxw.js 파일 복원 실패: $_" -ForegroundColor Red
                    Write-Host "  ⚠️  수동으로 복원이 필요할 수 있습니다" -ForegroundColor Yellow
                }
            } else {
                Write-Host "  ❌ 백업 파일도 없습니다. 수동 복원이 필요합니다" -ForegroundColor Red
            }
        } else {
            Write-Host "  ✅ nxw.js 파일 보호 확인 완료" -ForegroundColor Green
        }

        # 백업 파일 정리
        if (Test-Path $nxwJsBackupPath) {
            Remove-Item $nxwJsBackupPath -Force -ErrorAction SilentlyContinue
        }
    }
}

# 3. 프로젝트 내 빌드 캐시 정리 (선택사항)
if (-not $SkipBuildCache) {
    Write-Host "`n🔨 프로젝트 빌드 캐시 정리 중..." -ForegroundColor Yellow
    $buildDirs = @(
        @{ Path = "$projectRoot\.gradle"; Name = "Gradle 캐시" },
        @{ Path = "$projectRoot\build"; Name = "빌드 출력" },
        @{ Path = "$projectRoot\build-logic\.gradle"; Name = "build-logic Gradle 캐시" },
        @{ Path = "$projectRoot\build-logic\build"; Name = "build-logic 빌드 출력" },
        @{ Path = "$projectRoot\build-logic\bin"; Name = "build-logic bin" },
        @{ Path = "$projectRoot\.nx\workspace-data"; Name = "Nx 워크스페이스 데이터" },
        @{ Path = "$projectRoot\node_modules\.cache"; Name = "Node.js 캐시" }
    )

    $buildCachesToClean = @()
    foreach ($dir in $buildDirs) {
        if (Test-Path $dir.Path) {
            $buildCachesToClean += $dir
        }
    }

    if ($Interactive -and $buildCachesToClean.Count -gt 0) {
        Write-Host "`n발견된 빌드 캐시:" -ForegroundColor Cyan
        for ($i = 0; $i -lt $buildCachesToClean.Count; $i++) {
            Write-Host "  [$i] $($buildCachesToClean[$i].Name)" -ForegroundColor White
        }
        $response = Read-Host "`n모두 삭제하시겠습니까? (y/N)"
        if ($response -ne 'y' -and $response -ne 'Y') {
            $buildCachesToClean = @()
        }
    }

    foreach ($dir in $buildCachesToClean) {
        Write-Host "  삭제: $($dir.Name)" -ForegroundColor Gray
        Remove-Item -Recurse -Force $dir.Path -ErrorAction SilentlyContinue
        $cleanedCount++
    }
} else {
    Write-Host "`n⏭️  프로젝트 빌드 캐시는 건너뜁니다" -ForegroundColor Yellow
}

# 4. Gradle 사용자 캐시 정리 (선택사항)
if ($GradleUserCache) {
    Write-Host "`n📦 Gradle 사용자 캐시 정리 중..." -ForegroundColor Yellow
    $gradleCachePath = "$env:USERPROFILE\.gradle\caches"
    if (Test-Path $gradleCachePath) {
        $shouldCleanGradle = $true

        if ($Interactive) {
            $response = Read-Host "Gradle 사용자 캐시도 삭제하시겠습니까? (y/N)"
            $shouldCleanGradle = ($response -eq 'y' -or $response -eq 'Y')
        }

        if ($shouldCleanGradle) {
            Write-Host "  삭제 중: $gradleCachePath" -ForegroundColor Gray
            Get-ChildItem $gradleCachePath -Directory -ErrorAction SilentlyContinue |
                Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  ✅ Gradle 사용자 캐시 삭제 완료" -ForegroundColor Green
            $cleanedCount++
        } else {
            Write-Host "  ⏭️  Gradle 사용자 캐시는 유지합니다" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ℹ️  Gradle 사용자 캐시가 없습니다" -ForegroundColor Gray
    }
}

Write-Host "`n✅ 정리 완료! ($cleanedCount 개 항목 삭제)" -ForegroundColor Green

if ($cleanedCount -gt 0) {
    Write-Host "`n💡 다음 단계:" -ForegroundColor Cyan
    Write-Host "   1. Cursor를 완전히 종료하세요 (모든 창 닫기)" -ForegroundColor White
    Write-Host "   2. Cursor를 다시 시작하세요" -ForegroundColor White
    if ($currentWorkspacePath) {
        Write-Host "   3. 워크스페이스 파일로 프로젝트를 다시 여세요" -ForegroundColor White
    } else {
        Write-Host "   3. 프로젝트를 다시 여세요" -ForegroundColor White
    }
} else {
    Write-Host "`n💡 정리할 항목이 없습니다." -ForegroundColor Yellow
}

Write-Host "`n📖 사용법:" -ForegroundColor Cyan
Write-Host "   .\scripts\clean-workspace-cache.ps1                    # 현재 프로젝트만" -ForegroundColor Gray
Write-Host "   .\scripts\clean-workspace-cache.ps1 -AllWorkspaces     # 모든 워크스페이스" -ForegroundColor Gray
Write-Host "   .\scripts\clean-workspace-cache.ps1 -Interactive       # 대화형 모드" -ForegroundColor Gray
Write-Host "   .\scripts\clean-workspace-cache.ps1 -SkipBuildCache    # 빌드 캐시 제외" -ForegroundColor Gray
Write-Host "   .\scripts\clean-workspace-cache.ps1 -GradleUserCache   # Gradle 사용자 캐시 포함" -ForegroundColor Gray

