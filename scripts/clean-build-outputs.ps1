# 빌드 산출물 정리 스크립트
# .gitignore에 포함된 빌드 산출물 디렉토리들을 안전하게 정리합니다.
#
# 사용법:
#   .\scripts\clean-build-outputs.ps1              # 모든 빌드 산출물 정리
#   .\scripts\clean-build-outputs.ps1 -DryRun      # 삭제할 항목만 확인 (실제 삭제 안 함)
#   .\scripts\clean-build-outputs.ps1 -Interactive # 대화형 모드

param(
    [switch]$DryRun,        # 건조 실행 (실제 삭제 안 함)
    [switch]$Interactive,   # 대화형 모드
    [switch]$ForceRebuild   # build-logic 강제 재빌드 (clean:all에서 사용)
)

Write-Host "🧹 빌드 산출물 정리 시작..." -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "⚠️  건조 실행 모드: 실제로 삭제하지 않습니다" -ForegroundColor Yellow
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$cleanedCount = 0
$totalSize = 0

# 보호할 중요 파일 패턴 (Nx 설정 파일 등)
$protectedFiles = @(
    ".nx.js",
    "nxw.js",
    ".nxw.js"
)

# 보호할 중요 디렉토리/파일 (절대 경로)
$protectedPaths = @(
    "$projectRoot\.nx\nxw.js"
)

# 삭제 전 보호 파일 확인 함수
function Test-ProtectedFiles {
    param([string]$Path)

    # 보호된 절대 경로 확인
    foreach ($protectedPath in $protectedPaths) {
        if ($Path -like "$protectedPath*") {
            return $true
        }
    }

    # 보호된 파일 패턴 확인
    foreach ($pattern in $protectedFiles) {
        if ($Path -like "*\$pattern" -or $Path -like "*\$pattern\*") {
            return $true
        }
    }

    return $false
}

# .gitignore에 포함된 빌드 산출물 디렉토리 목록
$buildOutputDirs = @(
    @{
        Path = "$projectRoot\dist";
        Name = "dist/ (루트)";
        Description = "루트 dist 디렉토리"
    },
    @{
        Path = "$projectRoot\tmp";
        Name = "tmp/ (루트)";
        Description = "루트 임시 파일 디렉토리"
    },
    @{
        Path = "$projectRoot\build";
        Name = "build/ (루트)";
        Description = "루트 빌드 디렉토리"
    },
    @{
        Path = "$projectRoot\out-tsc";
        Name = "out-tsc/ (루트)";
        Description = "루트 TypeScript 컴파일 출력"
    },
    @{
        Path = "$projectRoot\reelnote-api\catalog-service\dist";
        Name = "catalog-service/dist/";
        Description = "Catalog Service 빌드 출력"
    },
    @{
        Path = "$projectRoot\reelnote-api\catalog-service\out-tsc";
        Name = "catalog-service/out-tsc/";
        Description = "Catalog Service TypeScript 컴파일 출력"
    },
    @{
        Path = "$projectRoot\reelnote-api\review-service\build";
        Name = "review-service/build/";
        Description = "Review Service 빌드 출력"
    },
    @{
        Path = "$projectRoot\reelnote-api\review-service\bin";
        Name = "review-service/bin/";
        Description = "Review Service 바이너리 출력"
    },
    @{
        Path = "$projectRoot\build-logic\build";
        Name = "build-logic/build/";
        Description = "Build Logic 빌드 출력"
    },
    @{
        Path = "$projectRoot\build-logic\bin";
        Name = "build-logic/bin/";
        Description = "Build Logic 바이너리 출력"
    },
    @{
        Path = "$projectRoot\dist\reelnote-frontend";
        Name = "dist/reelnote-frontend/";
        Description = "Frontend 빌드 출력"
    },
    @{
        Path = "$projectRoot\dist\out-tsc";
        Name = "dist/out-tsc/";
        Description = "루트 dist 내 out-tsc"
    },
    @{
        Path = "$projectRoot\tests\e2e-review\bin";
        Name = "e2e-review/bin/";
        Description = "E2E Review 바이너리 출력"
    },
    @{
        Path = "$projectRoot\tests\e2e-review\build";
        Name = "e2e-review/build/";
        Description = "E2E Review 빌드 출력"
    }
)

# 존재하는 디렉토리 찾기
$dirsToClean = @()
foreach ($dir in $buildOutputDirs) {
    if (Test-Path $dir.Path -PathType Container) {
        # 디렉토리 크기 계산
        $size = (Get-ChildItem $dir.Path -Recurse -ErrorAction SilentlyContinue |
                 Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
        $sizeMB = if ($size) { [math]::Round($size / 1MB, 2) } else { 0 }

        $dirsToClean += @{
            Path = $dir.Path
            Name = $dir.Name
            Description = $dir.Description
            SizeMB = $sizeMB
        }

        $totalSize += $sizeMB
    }
}

if ($dirsToClean.Count -eq 0) {
    Write-Host "`n✅ 정리할 빌드 산출물이 없습니다." -ForegroundColor Green
    exit 0
}

# 대화형 모드
if ($Interactive) {
    Write-Host "`n발견된 빌드 산출물 디렉토리:" -ForegroundColor Cyan
    for ($i = 0; $i -lt $dirsToClean.Count; $i++) {
        $dir = $dirsToClean[$i]
        Write-Host "  [$i] $($dir.Name) - $($dir.SizeMB) MB" -ForegroundColor White
        Write-Host "      $($dir.Description)" -ForegroundColor Gray
    }
    Write-Host "`n총 크기: $([math]::Round($totalSize, 2)) MB" -ForegroundColor Yellow
    $response = Read-Host "`n모두 삭제하시겠습니까? (y/N)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "❌ 취소되었습니다." -ForegroundColor Yellow
        exit 0
    }
}

# 삭제 실행
Write-Host "`n🗑️  삭제 중..." -ForegroundColor Yellow
foreach ($dir in $dirsToClean) {
    # 보호된 파일 확인
    if (Test-ProtectedFiles -Path $dir.Path) {
        Write-Host "  ⚠️  건너뜀: $($dir.Name) (보호된 파일 포함)" -ForegroundColor Yellow
        continue
    }

    if ($DryRun) {
        Write-Host "  [건조 실행] $($dir.Name) - $($dir.SizeMB) MB" -ForegroundColor Gray

        # 건조 실행 시에도 보호된 파일이 있는지 확인
        $protectedFound = $false
        try {
            $files = Get-ChildItem -Path $dir.Path -Recurse -File -ErrorAction SilentlyContinue
            foreach ($file in $files) {
                if (Test-ProtectedFiles -Path $file.FullName) {
                    $protectedFound = $true
                    Write-Host "    ⚠️  보호된 파일 발견: $($file.Name)" -ForegroundColor Yellow
                }
            }
        } catch {
            # 무시
        }
    } else {
        Write-Host "  삭제: $($dir.Name) - $($dir.SizeMB) MB" -ForegroundColor Gray

        # 실제 삭제 전 최종 확인
        $protectedFound = $false
        try {
            $files = Get-ChildItem -Path $dir.Path -Recurse -File -ErrorAction SilentlyContinue
            foreach ($file in $files) {
                if (Test-ProtectedFiles -Path $file.FullName) {
                    $protectedFound = $true
                    Write-Host "    ⚠️  보호된 파일 발견: $($file.Name) - 건너뜀" -ForegroundColor Yellow
                }
            }
        } catch {
            # 무시
        }

        if ($protectedFound) {
            Write-Host "    ⚠️  보호된 파일이 포함되어 있어 삭제를 건너뜁니다" -ForegroundColor Yellow
            continue
        }

        try {
            Remove-Item -Recurse -Force $dir.Path -ErrorAction Stop
            $cleanedCount++
            Write-Host "    ✅ 완료" -ForegroundColor Green
        } catch {
            Write-Host "    ⚠️  실패: $_" -ForegroundColor Red
        }
    }
}

# build-logic 삭제 여부 확인 (삭제 후 체크)
$buildLogicCleaned = $false
if (-not $DryRun) {
    $buildLogicBuildPath = Join-Path $projectRoot "build-logic\build"
    # 삭제 대상에 build-logic이 있었고, 삭제 후 build 디렉토리가 없으면 재빌드 필요
    $buildLogicWasDeleted = $false
    foreach ($dir in $dirsToClean) {
        if ($dir.Path -eq $buildLogicBuildPath) {
            $buildLogicWasDeleted = $true
            break
        }
    }

    if ($buildLogicWasDeleted -and (Test-Path $buildLogicBuildPath -PathType Container) -eq $false) {
        $buildLogicCleaned = $true
    }
}

if ($DryRun) {
    Write-Host "`n📊 건조 실행 결과:" -ForegroundColor Cyan
    Write-Host "   발견된 디렉토리: $($dirsToClean.Count)개" -ForegroundColor White
    Write-Host "   총 크기: $([math]::Round($totalSize, 2)) MB" -ForegroundColor White

    # build-logic 삭제 예정인지 확인
    $willCleanBuildLogic = $false
    foreach ($dir in $dirsToClean) {
        if ($dir.Path -like "*build-logic\build*" -or $dir.Path -like "*build-logic\bin*") {
            $willCleanBuildLogic = $true
            break
        }
    }
    if ($willCleanBuildLogic) {
        Write-Host "`n⚠️  build-logic이 삭제 예정입니다" -ForegroundColor Yellow
        Write-Host "   삭제 후 자동으로 build-logic을 다시 빌드합니다" -ForegroundColor Gray
    }

    Write-Host "`n실제로 삭제하려면 -DryRun 옵션 없이 실행하세요." -ForegroundColor Yellow
} else {
    Write-Host "`n✨ 정리 완료!" -ForegroundColor Green
    Write-Host "   삭제된 디렉토리: $cleanedCount개" -ForegroundColor White
    Write-Host "   해제된 공간: $([math]::Round($totalSize, 2)) MB" -ForegroundColor White

    # build-logic이 삭제되었거나 강제 재빌드 옵션이 있으면 다시 빌드
    if ($buildLogicCleaned -or $ForceRebuild) {
        Write-Host "`n🔨 build-logic 재빌드 중..." -ForegroundColor Yellow
        try {
            $gradlewPath = Join-Path $projectRoot "gradlew.bat"
            if (Test-Path $gradlewPath) {
                Push-Location $projectRoot

                # Gradle 데몬 중지 (캐시 잠금 문제 방지)
                Write-Host "   Gradle 데몬 중지 중..." -ForegroundColor Gray
                & $gradlewPath --stop 2>&1 | Out-Null

                # Kotlin 증분 캐시 정리 (파일 잠금 문제 방지)
                $kotlinCachePath = Join-Path $projectRoot "build-logic\build\kotlin"
                if (Test-Path $kotlinCachePath) {
                    Write-Host "   Kotlin 증분 캐시 정리 중..." -ForegroundColor Gray
                    try {
                        Remove-Item -Recurse -Force $kotlinCachePath -ErrorAction SilentlyContinue
                    } catch {
                        # 무시 (이미 삭제되었거나 접근 불가능할 수 있음)
                    }
                }

                # 잠시 대기 (파일 잠금 해제 대기)
                Start-Sleep -Milliseconds 500

                $buildLogicPath = Join-Path $projectRoot "build-logic"
                & $gradlewPath -p $buildLogicPath build --quiet
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "   ✅ build-logic 빌드 완료" -ForegroundColor Green
                } else {
                    Write-Host "   ⚠️  build-logic 빌드 실패 (수동으로 빌드해주세요)" -ForegroundColor Red
                    Write-Host "   실행: .\gradlew.bat -p build-logic build" -ForegroundColor Gray
                }
                Pop-Location
            } else {
                Write-Host "   ⚠️  gradlew.bat를 찾을 수 없습니다" -ForegroundColor Red
                Write-Host "   수동으로 빌드해주세요: .\gradlew.bat -p build-logic build" -ForegroundColor Gray
            }
        } catch {
            Write-Host "   ⚠️  build-logic 빌드 중 오류: $_" -ForegroundColor Red
            Write-Host "   수동으로 빌드해주세요: .\gradlew.bat -p build-logic build" -ForegroundColor Gray
        }
    }
}

Write-Host "`n💡 참고:" -ForegroundColor Cyan
Write-Host "   - 이 디렉토리들은 .gitignore에 포함되어 있어 Git에 커밋되지 않습니다" -ForegroundColor Gray
Write-Host "   - 다음 빌드 시 자동으로 다시 생성됩니다" -ForegroundColor Gray
Write-Host "   - 중요 파일 (.nx.js, nxw.js 등)은 자동으로 보호됩니다" -ForegroundColor Gray
Write-Host "   - build-logic은 삭제 시 자동으로 재빌드됩니다 (경로 이슈 방지)" -ForegroundColor Gray

