package com.example.ajiportal.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathOperation
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.dp

@Composable
fun IslamicMedallion(
    modifier: Modifier = Modifier,
    color: Color = Color(0xFF10B981).copy(alpha = 0.08f)
) {
    Canvas(modifier = modifier) {
        val center = Offset(size.width / 2, size.height / 2)
        val maxRadius = size.minDimension * 0.45f
        
        // 1. Draw outermost circle
        drawCircle(
            color = color,
            radius = maxRadius,
            center = center,
            style = Stroke(width = 1.5.dp.toPx())
        )
        
        // 2. Draw outer 8-pointed star (overlapping squares)
        val outerSquareSize = maxRadius * 1.3f
        val outerTopLeft = Offset(center.x - outerSquareSize / 2, center.y - outerSquareSize / 2)
        val outerSquareRect = Size(outerSquareSize, outerSquareSize)
        
        drawRect(
            color = color,
            topLeft = outerTopLeft,
            size = outerSquareRect,
            style = Stroke(width = 1.5.dp.toPx())
        )
        rotate(45f, pivot = center) {
            drawRect(
                color = color,
                topLeft = outerTopLeft,
                size = outerSquareRect,
                style = Stroke(width = 1.5.dp.toPx())
            )
        }
        
        // 3. Draw inner concentric circle
        drawCircle(
            color = color,
            radius = maxRadius * 0.7f,
            center = center,
            style = Stroke(width = 1.dp.toPx())
        )
        
        // 4. Draw inner 8-pointed star
        val innerSquareSize = maxRadius * 0.9f
        val innerTopLeft = Offset(center.x - innerSquareSize / 2, center.y - innerSquareSize / 2)
        val innerSquareRect = Size(innerSquareSize, innerSquareSize)
        
        drawRect(
            color = color,
            topLeft = innerTopLeft,
            size = innerSquareRect,
            style = Stroke(width = 1.dp.toPx())
        )
        rotate(45f, pivot = center) {
            drawRect(
                color = color,
                topLeft = innerTopLeft,
                size = innerSquareRect,
                style = Stroke(width = 1.dp.toPx())
            )
        }
        
        // 5. Draw center-most small circle
        drawCircle(
            color = color,
            radius = maxRadius * 0.3f,
            center = center,
            style = Stroke(width = 1.dp.toPx())
        )
        
        // 6. Draw radial lines
        for (i in 0 until 8) {
            val angle = i * (Math.PI / 4)
            val start = Offset(
                (center.x + Math.cos(angle) * (maxRadius * 0.3f)).toFloat(),
                (center.y + Math.sin(angle) * (maxRadius * 0.3f)).toFloat()
            )
            val end = Offset(
                (center.x + Math.cos(angle) * (maxRadius * 0.7f)).toFloat(),
                (center.y + Math.sin(angle) * (maxRadius * 0.7f)).toFloat()
            )
            drawLine(
                color = color,
                start = start,
                end = end,
                strokeWidth = 0.8.dp.toPx()
            )
        }
    }
}

@Composable
fun IslamicStarCrescentLogo(
    modifier: Modifier = Modifier,
    primaryColor: Color = Color(0xFFD4AF37), // IslamicGold
    accentColor: Color = Color(0xFFB5893D)   // IslamicGoldDark
) {
    Canvas(modifier = modifier) {
        val center = Offset(size.width / 2, size.height / 2)
        val radius = size.minDimension * 0.45f
        
        // 1. Draw outer 8-pointed star (represented by two overlapping squares)
        val squareSize = radius * 1.35f
        val topLeft = Offset(center.x - squareSize / 2, center.y - squareSize / 2)
        val rectSize = Size(squareSize, squareSize)
        
        drawRect(
            color = primaryColor,
            topLeft = topLeft,
            size = rectSize,
            style = Stroke(width = 2.dp.toPx())
        )
        rotate(45f, pivot = center) {
            drawRect(
                color = primaryColor,
                topLeft = topLeft,
                size = rectSize,
                style = Stroke(width = 2.dp.toPx())
            )
        }
        
        // 2. Draw inner circle
        drawCircle(
            color = accentColor,
            radius = radius * 0.75f,
            center = center,
            style = Stroke(width = 1.dp.toPx())
        )
        
        // 3. Draw crescent moon inside
        val crescentPath = Path().apply {
            val crescentRadius = radius * 0.4f
            val moonCenter = Offset(center.x - crescentRadius * 0.12f, center.y)
            
            addOval(androidx.compose.ui.geometry.Rect(
                moonCenter.x - crescentRadius,
                moonCenter.y - crescentRadius,
                moonCenter.x + crescentRadius,
                moonCenter.y + crescentRadius
            ))
            
            val clipCenter = Offset(moonCenter.x + crescentRadius * 0.32f, moonCenter.y - crescentRadius * 0.08f)
            val clipRadius = crescentRadius * 0.95f
            val clipPath = Path().apply {
                addOval(androidx.compose.ui.geometry.Rect(
                    clipCenter.x - clipRadius,
                    clipCenter.y - clipRadius,
                    clipCenter.x + clipRadius,
                    clipCenter.y + clipRadius
                ))
            }
            op(this, clipPath, PathOperation.Difference)
        }
        
        drawPath(
            path = crescentPath,
            color = primaryColor
        )
        
        // 4. Draw small 5-pointed star inside the crescent opening
        val starCenter = Offset(center.x + radius * 0.22f, center.y - radius * 0.08f)
        val starRadius = radius * 0.12f
        
        val starPath = Path().apply {
            val points = 5
            val doublePi = Math.PI * 2
            val angleStep = doublePi / points
            val innerStarRadius = starRadius * 0.4f
            
            for (i in 0 until points) {
                val outerAngle = i * angleStep - Math.PI / 2
                val outerX = (starCenter.x + Math.cos(outerAngle) * starRadius).toFloat()
                val outerY = (starCenter.y + Math.sin(outerAngle) * starRadius).toFloat()
                if (i == 0) {
                    moveTo(outerX, outerY)
                } else {
                    lineTo(outerX, outerY)
                }
                
                val innerAngle = outerAngle + angleStep / 2
                val innerX = (starCenter.x + Math.cos(innerAngle) * innerStarRadius).toFloat()
                val innerY = (starCenter.y + Math.sin(innerAngle) * innerStarRadius).toFloat()
                lineTo(innerX, innerY)
            }
            close()
        }
        
        drawPath(
            path = starPath,
            color = primaryColor
        )
    }
}

@Composable
fun IslamicCornerOrnament(
    modifier: Modifier = Modifier,
    color: Color = Color(0xFFB5893D).copy(alpha = 0.12f)
) {
    Canvas(modifier = modifier) {
        val sizeMin = size.minDimension
        
        // Draw concentric arches from the corner (0,0)
        drawCircle(
            color = color,
            radius = sizeMin * 0.2f,
            center = Offset(0f, 0f),
            style = Stroke(width = 1.dp.toPx())
        )
        drawCircle(
            color = color,
            radius = sizeMin * 0.4f,
            center = Offset(0f, 0f),
            style = Stroke(width = 1.5.dp.toPx())
        )
        drawCircle(
            color = color,
            radius = sizeMin * 0.55f,
            center = Offset(0f, 0f),
            style = Stroke(width = 1.dp.toPx())
        )
        drawCircle(
            color = color,
            radius = sizeMin * 0.7f,
            center = Offset(0f, 0f),
            style = Stroke(width = 0.8.dp.toPx())
        )
        
        // Draw decorative lines radiating from corner
        for (i in 0..6) {
            val angle = i * (Math.PI / 12)
            val startX = (Math.cos(angle) * (sizeMin * 0.1f)).toFloat()
            val startY = (Math.sin(angle) * (sizeMin * 0.1f)).toFloat()
            val endX = (Math.cos(angle) * (sizeMin * 0.9f)).toFloat()
            val endY = (Math.sin(angle) * (sizeMin * 0.9f)).toFloat()
            drawLine(
                color = color,
                start = Offset(startX, startY),
                end = Offset(endX, endY),
                strokeWidth = 0.8.dp.toPx()
            )
        }
    }
}

@Composable
fun IslamicMosqueLogo(
    modifier: Modifier = Modifier,
    color: Color = Color(0xFF1F2937),
    goldColor: Color = Color(0xFFD4AF37)
) {
    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val cx = w / 2
        val cy = h / 2
        
        // Draw base ground line
        val groundY = h * 0.85f
        drawLine(
            color = color,
            start = Offset(w * 0.15f, groundY),
            end = Offset(w * 0.85f, groundY),
            strokeWidth = 2.dp.toPx()
        )
        
        // Draw central dome
        val domeRadius = w * 0.16f
        val domeCenter = Offset(cx, groundY)
        val domePath = Path().apply {
            moveTo(cx - domeRadius, groundY)
            quadraticTo(cx - domeRadius * 1.05f, groundY - domeRadius * 0.8f, cx, groundY - domeRadius * 1.25f)
            quadraticTo(cx + domeRadius * 1.05f, groundY - domeRadius * 0.8f, cx + domeRadius, groundY)
            close()
        }
        drawPath(path = domePath, color = color)
        
        // Draw crescent on central dome
        val crescentCenter = Offset(cx, groundY - domeRadius * 1.35f)
        drawCircle(
            color = goldColor,
            radius = w * 0.025f,
            center = crescentCenter
        )
        
        // Draw left side dome (smaller)
        val leftDomeRadius = w * 0.09f
        val leftDomeCx = cx - w * 0.18f
        val leftDomePath = Path().apply {
            moveTo(leftDomeCx - leftDomeRadius, groundY)
            quadraticTo(leftDomeCx - leftDomeRadius * 1.05f, groundY - leftDomeRadius * 0.8f, leftDomeCx, groundY - leftDomeRadius * 1.25f)
            quadraticTo(leftDomeCx + leftDomeRadius * 1.05f, groundY - leftDomeRadius * 0.8f, leftDomeCx + leftDomeRadius, groundY)
            close()
        }
        drawPath(path = leftDomePath, color = color)
        
        // Draw right side dome (smaller)
        val rightDomeCx = cx + w * 0.18f
        val rightDomePath = Path().apply {
            moveTo(rightDomeCx - leftDomeRadius, groundY)
            quadraticTo(rightDomeCx - leftDomeRadius * 1.05f, groundY - leftDomeRadius * 0.8f, rightDomeCx, groundY - leftDomeRadius * 1.25f)
            quadraticTo(rightDomeCx + leftDomeRadius * 1.05f, groundY - leftDomeRadius * 0.8f, rightDomeCx + leftDomeRadius, groundY)
            close()
        }
        drawPath(path = rightDomePath, color = color)
        
        // Draw left minaret (tall pillar)
        val minaretW = w * 0.045f
        val minaretLeft = cx - w * 0.32f
        val minaretH = h * 0.55f
        drawRect(
            color = color,
            topLeft = Offset(minaretLeft - minaretW / 2, groundY - minaretH),
            size = Size(minaretW, minaretH)
        )
        // Minaret balcony
        drawRect(
            color = goldColor,
            topLeft = Offset(minaretLeft - minaretW * 0.7f, groundY - minaretH * 0.75f),
            size = Size(minaretW * 1.4f, h * 0.025f)
        )
        // Minaret pointed cone top
        val minaretCap = Path().apply {
            moveTo(minaretLeft - minaretW / 2, groundY - minaretH)
            lineTo(minaretLeft, groundY - minaretH - w * 0.1f)
            lineTo(minaretLeft + minaretW / 2, groundY - minaretH)
            close()
        }
        drawPath(path = minaretCap, color = color)
        
        // Draw right minaret (tall pillar)
        val minaretRight = cx + w * 0.32f
        drawRect(
            color = color,
            topLeft = Offset(minaretRight - minaretW / 2, groundY - minaretH),
            size = Size(minaretW, minaretH)
        )
        // Minaret balcony
        drawRect(
            color = goldColor,
            topLeft = Offset(minaretRight - minaretW * 0.7f, groundY - minaretH * 0.75f),
            size = Size(minaretW * 1.4f, h * 0.025f)
        )
        // Minaret pointed cone top
        val minaretCapRight = Path().apply {
            moveTo(minaretRight - minaretW / 2, groundY - minaretH)
            lineTo(minaretRight, groundY - minaretH - w * 0.1f)
            lineTo(minaretRight + minaretW / 2, groundY - minaretH)
            close()
        }
        drawPath(path = minaretCapRight, color = color)
    }
}
